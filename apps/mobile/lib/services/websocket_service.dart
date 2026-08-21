import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import '../models/thread_model.dart';

typedef OnNewEmailCallback = void Function(ThreadModel thread);
typedef OnThreadUpdateCallback = void Function(String threadId, String action);

class MobileWebSocketService {
  final String wsUrl;
  final String? token;
  WebSocket? _socket;
  bool _isConnected = false;
  bool _isDisposed = false;
  Timer? _reconnectTimer;

  OnNewEmailCallback? onNewEmail;
  OnThreadUpdateCallback? onThreadUpdate;

  MobileWebSocketService({
    this.wsUrl = 'ws://10.0.2.2:8081',
    this.token,
  });

  bool get isConnected => _isConnected;

  Future<void> connect({required String mailboxId}) async {
    if (_isDisposed) return;

    try {
      final uri = Uri.parse('$wsUrl?token=${token ?? ''}&mailboxId=$mailboxId');
      _socket = await WebSocket.connect(uri.toString())
          .timeout(const Duration(seconds: 5));
      _isConnected = true;

      // Subscribe to mailbox channel
      _socket?.add(jsonEncode({
        'action': 'subscribe',
        'channel': 'mailbox:$mailboxId',
      }));

      _socket?.listen(
        (data) {
          _handleMessage(data.toString());
        },
        onError: (err) {
          _handleDisconnect(mailboxId);
        },
        onDone: () {
          _handleDisconnect(mailboxId);
        },
        cancelOnError: true,
      );
    } catch (_) {
      _handleDisconnect(mailboxId);
    }
  }

  void _handleMessage(String raw) {
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      final event = map['event'] as String? ?? '';
      final payload = map['payload'] as Map<String, dynamic>? ?? {};

      if (event == 'mail.accepted' || event == 'email.arrived') {
        final thread = ThreadModel.fromJson(payload);
        onNewEmail?.call(thread);
      } else if (event == 'thread.updated') {
        final threadId = payload['threadId'] as String? ?? '';
        final action = payload['action'] as String? ?? 'update';
        onThreadUpdate?.call(threadId, action);
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error parsing WebSocket message: $e');
      }
    }
  }

  void _handleDisconnect(String mailboxId) {
    _isConnected = false;
    _socket?.close();
    _socket = null;

    if (!_isDisposed) {
      _reconnectTimer?.cancel();
      _reconnectTimer = Timer(const Duration(seconds: 5), () {
        if (!_isConnected && !_isDisposed) {
          connect(mailboxId: mailboxId);
        }
      });
    }
  }

  void simulateIncomingEvent(Map<String, dynamic> eventData) {
    _handleMessage(jsonEncode(eventData));
  }

  void disconnect() {
    _isDisposed = true;
    _reconnectTimer?.cancel();
    _socket?.close();
    _isConnected = false;
  }
}
