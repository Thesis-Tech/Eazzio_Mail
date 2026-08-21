import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:eazzio_mail_mobile/models/auth_user.dart';
import 'package:eazzio_mail_mobile/models/thread_model.dart';
import 'package:eazzio_mail_mobile/models/message_model.dart';
import 'package:eazzio_mail_mobile/providers/auth_provider.dart';
import 'package:eazzio_mail_mobile/providers/mailbox_provider.dart';
import 'package:eazzio_mail_mobile/screens/inbox_screen.dart';
import 'package:eazzio_mail_mobile/screens/message_detail_screen.dart';
import 'package:eazzio_mail_mobile/screens/compose_screen.dart';

void main() {
  group('Mobile Mailbox & Conversation UI Tests (TASK-026 & TASK-027 & TASK-028)', () {
    late AuthProvider authProvider;
    late MailboxProvider mailboxProvider;

    final testUser = const AuthUser(
      id: 'usr_123',
      email: 'rahul@eazzio.com',
      displayName: 'Rahul Kumar',
      role: 'User',
      mailboxId: 'mbx_123',
      token: 'jwt_mock_token',
    );

    final sampleThreads = [
      ThreadModel(
        id: 't1',
        mailboxId: 'usr_123',
        subject: 'Welcome to Eazzio Mail',
        snippet: 'Your secure, privacy-first mailbox is ready.',
        sender: 'support@eazzio.com',
        lastMessageAt: DateTime.now(),
        isRead: false,
        isStarred: false,
        folderKind: 'inbox',
      ),
      ThreadModel(
        id: 't2',
        mailboxId: 'usr_123',
        subject: 'Security Audit Report',
        snippet: 'Zero-Access encryption verified for all tenants.',
        sender: 'security@eazzio.com',
        lastMessageAt: DateTime.now().subtract(const Duration(hours: 2)),
        isRead: true,
        isStarred: true,
        folderKind: 'inbox',
      ),
    ];

    setUp(() {
      authProvider = AuthProvider();
      authProvider.setUserForTesting(testUser);
      mailboxProvider = MailboxProvider();
      mailboxProvider.setThreads(sampleThreads);
    });

    Widget createTestApp(Widget home) {
      return MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
          ChangeNotifierProvider<MailboxProvider>.value(value: mailboxProvider),
        ],
        child: MaterialApp(
          home: home,
        ),
      );
    }

    testWidgets('should render InboxScreen with thread list and folder title', (tester) async {
      await tester.pumpWidget(createTestApp(const InboxScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Inbox'), findsOneWidget);
      expect(find.text('Welcome to Eazzio Mail'), findsOneWidget);
      expect(find.text('Security Audit Report'), findsOneWidget);
      expect(find.byKey(const Key('compose_fab')), findsOneWidget);
    });

    testWidgets('should filter threads when search query is entered', (tester) async {
      await tester.pumpWidget(createTestApp(const InboxScreen()));
      await tester.pumpAndSettle();

      // Open search
      await tester.tap(find.byKey(const Key('search_toggle_button')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('search_input')), findsOneWidget);

      // Enter search term
      await tester.enterText(find.byKey(const Key('search_input')), 'Security');
      await tester.pumpAndSettle();

      expect(find.text('Security Audit Report'), findsOneWidget);
      expect(find.text('Welcome to Eazzio Mail'), findsNothing);
    });

    testWidgets('should toggle star status on thread', (tester) async {
      await tester.pumpWidget(createTestApp(const InboxScreen()));
      await tester.pumpAndSettle();

      expect(mailboxProvider.threads[0].isStarred, isFalse);

      // Tap star on first thread
      final starIcons = find.byIcon(Icons.star_border);
      expect(starIcons, findsWidgets);
      await tester.tap(starIcons.first);
      await tester.pumpAndSettle();

      expect(mailboxProvider.allThreads[0].isStarred, isTrue);
    });

    testWidgets('should render MessageDetailScreen and show conversation details', (tester) async {
      final thread = sampleThreads[0];
      await tester.pumpWidget(createTestApp(MessageDetailScreen(thread: thread)));
      await tester.pumpAndSettle();

      expect(find.text('Welcome to Eazzio Mail'), findsWidgets);
      expect(find.text('support@eazzio.com'), findsOneWidget);
      expect(find.text('Your secure, privacy-first mailbox is ready.'), findsOneWidget);
      expect(find.byKey(const Key('reply_button')), findsOneWidget);
      expect(find.byKey(const Key('forward_button')), findsOneWidget);
    });

    testWidgets('should validate recipient and compose email in ComposeScreen', (tester) async {
      await tester.pumpWidget(createTestApp(const ComposeScreen()));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('compose_to_input')), findsOneWidget);
      expect(find.byKey(const Key('compose_subject_input')), findsOneWidget);
      expect(find.byKey(const Key('compose_body_input')), findsOneWidget);
      expect(find.byKey(const Key('send_button')), findsOneWidget);

      // Attempt send with empty recipient
      await tester.tap(find.byKey(const Key('send_button')));
      await tester.pumpAndSettle();

      expect(find.text('Please enter at least one recipient address'), findsOneWidget);

      // Fill in fields
      await tester.enterText(find.byKey(const Key('compose_to_input')), 'bob@eazzio.com');
      await tester.enterText(find.byKey(const Key('compose_subject_input')), 'Mobile Test');
      await tester.enterText(find.byKey(const Key('compose_body_input')), 'Sent from mobile client');
      await tester.pumpAndSettle();

      // Submit
      await tester.tap(find.byKey(const Key('send_button')));
      await tester.pumpAndSettle();
    });
  });
}
