import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:eazzio_mail_mobile/main.dart';
import 'package:eazzio_mail_mobile/services/secure_storage_service.dart';
import 'package:eazzio_mail_mobile/providers/auth_provider.dart';

void main() {
  group('TASK-025: Mobile Widget & Navigation Tests', () {
    late InMemoryStorage storage;
    late SecureStorageService storageService;
    late AuthProvider authProvider;

    setUp(() {
      storage = InMemoryStorage();
      storageService = SecureStorageService(storage);
      authProvider = AuthProvider(storageService);
    });

    testWidgets('should render SplashScreen with Eazzio brand elements', (WidgetTester tester) async {
      await tester.pumpWidget(EazzioMailApp(authProvider: authProvider));
      await tester.pump();

      expect(find.text('Eazzio Mail'), findsOneWidget);
      expect(find.text('Privacy-First Email Infrastructure'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      await tester.pumpAndSettle();
    });

    testWidgets('should navigate to LoginScreen and render credentials form', (WidgetTester tester) async {
      await tester.pumpWidget(EazzioMailApp(authProvider: authProvider));
      await tester.pumpAndSettle();

      expect(find.text('Welcome to Eazzio'), findsOneWidget);
      expect(find.byKey(const Key('email_field')), findsOneWidget);
      expect(find.byKey(const Key('password_field')), findsOneWidget);
      expect(find.byKey(const Key('login_button')), findsOneWidget);
    });

    testWidgets('should execute login flow and transition to HomeScreen', (WidgetTester tester) async {
      await tester.pumpWidget(EazzioMailApp(authProvider: authProvider));
      await tester.pumpAndSettle();

      // Enter valid credentials
      await tester.enterText(find.byKey(const Key('email_field')), 'rahul@eazzio.com');
      await tester.enterText(find.byKey(const Key('password_field')), 'secret123');

      // Tap Sign In
      await tester.tap(find.byKey(const Key('login_button')));
      await tester.pumpAndSettle();

      // Verify HomeScreen is rendered with user email and security badge
      expect(find.text('rahul@eazzio.com'), findsOneWidget);
      expect(find.text('Protected by Eazzio TLS & Zero-Access Vault'), findsOneWidget);
      expect(find.byKey(const Key('logout_button')), findsOneWidget);
    });

    testWidgets('should log out from HomeScreen back to LoginScreen', (WidgetTester tester) async {
      await tester.pumpWidget(EazzioMailApp(authProvider: authProvider));
      await tester.pumpAndSettle();

      // Login first
      await tester.tap(find.byKey(const Key('login_button')));
      await tester.pumpAndSettle();

      // Now tap Logout
      await tester.tap(find.byKey(const Key('logout_button')));
      await tester.pumpAndSettle();

      // Verify returned to LoginScreen
      expect(find.text('Welcome to Eazzio'), findsOneWidget);
    });
  });
}
