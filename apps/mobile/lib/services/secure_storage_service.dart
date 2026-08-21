import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/auth_user.dart';

abstract class StorageInterface {
  Future<void> write({required String key, required String? value});
  Future<String?> read({required String key});
  Future<void> delete({required String key});
  Future<void> deleteAll();
}

class FlutterSecureStorageWrapper implements StorageInterface {
  final FlutterSecureStorage _storage;

  FlutterSecureStorageWrapper([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();

  @override
  Future<void> write({required String key, required String? value}) =>
      _storage.write(key: key, value: value);

  @override
  Future<String?> read({required String key}) => _storage.read(key: key);

  @override
  Future<void> delete({required String key}) => _storage.delete(key: key);

  @override
  Future<void> deleteAll() => _storage.deleteAll();
}

class InMemoryStorage implements StorageInterface {
  final Map<String, String> _data = {};

  @override
  Future<void> write({required String key, required String? value}) async {
    if (value == null) {
      _data.remove(key);
    } else {
      _data[key] = value;
    }
  }

  @override
  Future<String?> read({required String key}) async => _data[key];

  @override
  Future<void> delete({required String key}) async => _data.remove(key);

  @override
  Future<void> deleteAll() async => _data.clear();
}

class SecureStorageService {
  static const String _userKey = 'eazzio_auth_user';
  static const String _tokenKey = 'eazzio_jwt_token';

  final StorageInterface _storage;

  SecureStorageService([StorageInterface? storage])
      : _storage = storage ?? FlutterSecureStorageWrapper();

  Future<void> saveUser(AuthUser user) async {
    await _storage.write(key: _userKey, value: user.toJson());
    await _storage.write(key: _tokenKey, value: user.token);
  }

  Future<AuthUser?> getUser() async {
    final jsonStr = await _storage.read(key: _userKey);
    if (jsonStr == null || jsonStr.isEmpty) return null;
    try {
      return AuthUser.fromJson(jsonStr);
    } catch (_) {
      return null;
    }
  }

  Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
  }

  Future<void> clearAuth() async {
    await _storage.delete(key: _userKey);
    await _storage.delete(key: _tokenKey);
  }
}
