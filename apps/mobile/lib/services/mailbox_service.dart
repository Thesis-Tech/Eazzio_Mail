import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/thread_model.dart';
import '../models/message_model.dart';

class MailboxService {
  final String baseUrl;
  final String? token;

  MailboxService({
    this.baseUrl = 'http://10.0.2.2:8080',
    this.token,
  });

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  Future<List<ThreadModel>> fetchThreads({
    required String mailboxId,
    String folderKind = 'inbox',
    int limit = 50,
  }) async {
    try {
      final res = await http.get(
        Uri.parse('$baseUrl/v1/mailboxes/$mailboxId/threads?folder=$folderKind&limit=$limit'),
        headers: _headers,
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final list = (data['threads'] as List<dynamic>?) ?? (data['data'] as List<dynamic>?) ?? [];
        return list.map((e) => ThreadModel.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (_) {
      // Return empty list on network or parse error
    }
    return [];
  }

  Future<List<MessageModel>> fetchThreadMessages({
    required String mailboxId,
    required String threadId,
  }) async {
    try {
      final res = await http.get(
        Uri.parse('$baseUrl/v1/mailboxes/$mailboxId/threads/$threadId/messages'),
        headers: _headers,
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final list = (data['messages'] as List<dynamic>?) ?? (data['data'] as List<dynamic>?) ?? [];
        return list.map((e) => MessageModel.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (_) {
      // Fallback
    }
    return [];
  }

  Future<bool> sendMessage({
    required List<String> to,
    required String subject,
    required String bodyText,
    String? bodyHtml,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/v1/messages/compose'),
        headers: _headers,
        body: jsonEncode({
          'to': to,
          'subject': subject,
          'bodyText': bodyText,
          'bodyHtml': bodyHtml ?? '<p>$bodyText</p>',
        }),
      );
      return res.statusCode == 200 || res.statusCode == 202;
    } catch (_) {
      return false;
    }
  }

  Future<bool> updateThreadFlags({
    required String mailboxId,
    required String threadId,
    bool? isRead,
    bool? isStarred,
  }) async {
    try {
      final res = await http.patch(
        Uri.parse('$baseUrl/v1/mailboxes/$mailboxId/threads/$threadId'),
        headers: _headers,
        body: jsonEncode({
          if (isRead != null) 'isRead': isRead,
          if (isStarred != null) 'isStarred': isStarred,
        }),
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<bool> moveThread({
    required String mailboxId,
    required String threadId,
    required String targetFolder,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/v1/mailboxes/$mailboxId/threads/$threadId/move'),
        headers: _headers,
        body: jsonEncode({'targetFolder': targetFolder}),
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }
}
