import 'package:flutter_test/flutter_test.dart';
import 'package:eazzio_mail_mobile/models/thread_model.dart';
import 'package:eazzio_mail_mobile/services/websocket_service.dart';
import 'package:eazzio_mail_mobile/providers/mailbox_provider.dart';

void main() {
  group('Mobile Realtime WebSocket & Arrival Alert Tests (TASK-029)', () {
    test('MobileWebSocketService should handle and dispatch incoming email arrival events', () {
      final wsService = MobileWebSocketService();
      ThreadModel? receivedThread;

      wsService.onNewEmail = (thread) {
        receivedThread = thread;
      };

      wsService.simulateIncomingEvent({
        'event': 'mail.accepted',
        'payload': {
          'id': 'thread_live_123',
          'mailbox_id': 'mbx_user',
          'subject': 'Realtime Notification Alert',
          'snippet': 'Instant delivery arrived via WebSocket gateway',
          'from_address': 'alerts@eazzio.com',
          'last_message_at': DateTime.now().toIso8601String(),
          'is_read': false,
          'folder_kind': 'inbox',
        },
      });

      expect(receivedThread, isNotNull);
      expect(receivedThread!.id, equals('thread_live_123'));
      expect(receivedThread!.subject, equals('Realtime Notification Alert'));
      expect(receivedThread!.sender, equals('alerts@eazzio.com'));
    });

    test('MailboxProvider should prepend incoming realtime threads and trigger alert', () {
      final wsService = MobileWebSocketService();
      final mailboxProvider = MailboxProvider(wsService: wsService);

      expect(mailboxProvider.threads.length, equals(0));
      expect(mailboxProvider.latestArrivalAlert, isNull);

      // Simulate incoming event
      wsService.simulateIncomingEvent({
        'event': 'mail.accepted',
        'payload': {
          'id': 'thread_rt_999',
          'mailbox_id': 'mbx_primary',
          'subject': 'Realtime Push Message',
          'snippet': 'Socket broadcast verified',
          'from_address': 'ceo@eazzio.com',
          'last_message_at': DateTime.now().toIso8601String(),
          'is_read': false,
          'folder_kind': 'inbox',
        },
      });

      expect(mailboxProvider.threads.length, equals(1));
      expect(mailboxProvider.threads[0].id, equals('thread_rt_999'));
      expect(mailboxProvider.threads[0].sender, equals('ceo@eazzio.com'));
      expect(mailboxProvider.unreadCount, equals(1));
      expect(mailboxProvider.latestArrivalAlert, contains('New email from ceo@eazzio.com'));

      // Clear alert
      mailboxProvider.clearArrivalAlert();
      expect(mailboxProvider.latestArrivalAlert, isNull);
    });

    test('MobileWebSocketService should handle thread.updated delete action', () {
      final wsService = MobileWebSocketService();
      final mailboxProvider = MailboxProvider(wsService: wsService);

      mailboxProvider.setThreads([
        ThreadModel(
          id: 'thread_to_delete',
          mailboxId: 'mbx_primary',
          subject: 'To Be Deleted',
          snippet: 'Testing thread deletion',
          sender: 'system@eazzio.com',
          lastMessageAt: DateTime.now(),
          isRead: true,
          folderKind: 'inbox',
        ),
      ]);

      expect(mailboxProvider.threads.length, equals(1));

      // Simulate thread.updated delete event
      wsService.simulateIncomingEvent({
        'event': 'thread.updated',
        'payload': {
          'threadId': 'thread_to_delete',
          'action': 'delete',
        },
      });

      expect(mailboxProvider.threads.length, equals(0));
    });
  });
}
