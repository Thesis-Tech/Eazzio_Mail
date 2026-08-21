import 'package:flutter/foundation.dart';
import '../models/auth_user.dart';
import '../services/secure_storage_service.dart';

class AuthProvider extends ChangeNotifier {
  final SecureStorageService _storageService;

  AuthUser? _currentUser;
  bool _isLoading = false;
  bool _isInitialized = false;
  String? _errorMessage;

  AuthProvider([SecureStorageService? storageService])
      : _storageService = storageService ?? SecureStorageService();

  AuthUser? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;
  bool get isLoading => _isLoading;
  bool get isInitialized => _isInitialized;
  String? get errorMessage => _errorMessage;

  void setUserForTesting(AuthUser? user) {
    _currentUser = user;
    _isInitialized = true;
    _isLoading = false;
    notifyListeners();
  }

  Future<void> restoreSession() async {
    _isLoading = true;
    notifyListeners();

    try {
      final user = await _storageService.getUser();
      _currentUser = user;
    } catch (_) {
      _currentUser = null;
    } finally {
      _isLoading = false;
      _isInitialized = true;
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final cleanEmail = email.trim().toLowerCase();

    try {
      if (cleanEmail.isEmpty || password.isEmpty) {
        throw Exception('Email and password are required.');
      }

      if (!cleanEmail.contains('@')) {
        throw Exception('Please enter a valid email address.');
      }

      // Simulate Authentication & Token Resolution
      await Future.delayed(const Duration(milliseconds: 300));

      final user = AuthUser(
        id: 'usr-${DateTime.now().millisecondsSinceEpoch}',
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0].toUpperCase(),
        role: cleanEmail.contains('admin') ? 'OrgAdmin' : 'User',
        mailboxId: 'mbx-primary',
        token: 'jwt-mobile-token-${DateTime.now().millisecondsSinceEpoch}',
      );

      await _storageService.saveUser(user);
      _currentUser = user;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    await _storageService.clearAuth();
    _currentUser = null;
    _errorMessage = null;
    _isLoading = false;
    notifyListeners();
  }
}
