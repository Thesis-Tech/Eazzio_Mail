import 'dart:convert';

class AuthUser {
  final String id;
  final String email;
  final String displayName;
  final String role;
  final String mailboxId;
  final String token;

  const AuthUser({
    required this.id,
    required this.email,
    required this.displayName,
    required this.role,
    required this.mailboxId,
    required this.token,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'email': email,
      'displayName': displayName,
      'role': role,
      'mailboxId': mailboxId,
      'token': token,
    };
  }

  factory AuthUser.fromMap(Map<String, dynamic> map) {
    return AuthUser(
      id: map['id'] ?? '',
      email: map['email'] ?? '',
      displayName: map['displayName'] ?? '',
      role: map['role'] ?? 'User',
      mailboxId: map['mailboxId'] ?? '',
      token: map['token'] ?? '',
    );
  }

  String toJson() => json.encode(toMap());

  factory AuthUser.fromJson(String source) => AuthUser.fromMap(json.decode(source));
}
