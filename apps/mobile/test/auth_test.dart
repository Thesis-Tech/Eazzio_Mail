import 'package:flutter_test/flutter_test.dart';
import 'package:eazzio_mail_mobile/models/auth_user.dart';
import 'package:eazzio_mail_mobile/services/secure_storage_service.dart';
import 'package:eazzio_mail_mobile/providers/auth_provider.dart';

void main() {
  group('TASK-025: Mobile Auth & Secure Storage Tests', () {
    late InMemoryStorage inMemoryStorage;
    late SecureStorageService storageService;
    late AuthProvider authProvider;

    setUp(() {
      inMemoryStorage = InMemoryStorage();
      storageService = SecureStorageService(inMemoryStorage);
      authProvider = AuthProvider(storageService);
    });

    test('should initialize unauthenticated when storage is empty', () async {
      await authProvider.restoreSession();
      expect(authProvider.isAuthenticated, false);
      expect(authProvider.currentUser, isNull);
    });

    test('should log in user and persist session token in secure storage', () async {
      final success = await authProvider.login('rahul@eazzio.com', 'password123');
      expect(success, true);
      expect(authProvider.isAuthenticated, true);
      expect(authProvider.currentUser?.email, 'rahul@eazzio.com');

      final savedUser = await storageService.getUser();
      expect(savedUser?.email, 'rahul@eazzio.com');
      final token = await storageService.getToken();
      expect(token, isNotNull);
      expect(token, startsWith('jwt-mobile-token'));
    });

    test('should fail login when email is invalid', () async {
      final success = await authProvider.login('invalid-email', 'password123');
      expect(success, false);
      expect(authProvider.isAuthenticated, false);
      expect(authProvider.errorMessage, contains('valid email'));
    });

    test('should clear secure storage and reset session upon logout', () async {
      await authProvider.login('priya@eazzio.com', 'password123');
      expect(authProvider.isAuthenticated, true);

      await authProvider.logout();
      expect(authProvider.isAuthenticated, false);
      expect(authProvider.currentUser, isNull);

      final savedUser = await storageService.getUser();
      expect(savedUser, isNull);
    });

    test('should restore authenticated session from secure storage', () async {
      const existingUser = AuthUser(
        id: 'usr-persisted',
        email: 'ceo@eazzio.com',
        displayName: 'CEO',
        role: 'OrgAdmin',
        mailboxId: 'mbx-1',
        token: 'jwt-persisted-xyz',
      );
      await storageService.saveUser(existingUser);

      final freshAuthProvider = AuthProvider(storageService);
      await freshAuthProvider.restoreSession();

      expect(freshAuthProvider.isAuthenticated, true);
      expect(freshAuthProvider.currentUser?.email, 'ceo@eazzio.com');
    });
  });
}
