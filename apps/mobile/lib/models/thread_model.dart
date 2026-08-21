class ThreadModel {
  final String id;
  final String mailboxId;
  final String subject;
  final String snippet;
  final String sender;
  final DateTime lastMessageAt;
  final int messageCount;
  final bool isRead;
  final bool isStarred;
  final String folderKind;
  final List<String> labels;

  const ThreadModel({
    required this.id,
    required this.mailboxId,
    required this.subject,
    required this.snippet,
    required this.sender,
    required this.lastMessageAt,
    this.messageCount = 1,
    this.isRead = false,
    this.isStarred = false,
    this.folderKind = 'inbox',
    this.labels = const [],
  });

  ThreadModel copyWith({
    String? id,
    String? mailboxId,
    String? subject,
    String? snippet,
    String? sender,
    DateTime? lastMessageAt,
    int? messageCount,
    bool? isRead,
    bool? isStarred,
    String? folderKind,
    List<String>? labels,
  }) {
    return ThreadModel(
      id: id ?? this.id,
      mailboxId: mailboxId ?? this.mailboxId,
      subject: subject ?? this.subject,
      snippet: snippet ?? this.snippet,
      sender: sender ?? this.sender,
      lastMessageAt: lastMessageAt ?? this.lastMessageAt,
      messageCount: messageCount ?? this.messageCount,
      isRead: isRead ?? this.isRead,
      isStarred: isStarred ?? this.isStarred,
      folderKind: folderKind ?? this.folderKind,
      labels: labels ?? this.labels,
    );
  }

  factory ThreadModel.fromJson(Map<String, dynamic> json) {
    return ThreadModel(
      id: json['id'] as String? ?? '',
      mailboxId: json['mailbox_id'] as String? ?? '',
      subject: json['subject_normalized'] as String? ?? json['subject'] as String? ?? 'No Subject',
      snippet: json['snippet'] as String? ?? '',
      sender: json['from_address'] as String? ?? json['sender'] as String? ?? 'Unknown',
      lastMessageAt: json['last_message_at'] != null
          ? DateTime.tryParse(json['last_message_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
      messageCount: json['message_count'] as int? ?? 1,
      isRead: json['is_read'] as bool? ?? false,
      isStarred: json['is_starred'] as bool? ?? false,
      folderKind: json['folder_kind'] as String? ?? 'inbox',
      labels: (json['labels'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'mailbox_id': mailboxId,
      'subject': subject,
      'snippet': snippet,
      'sender': sender,
      'last_message_at': lastMessageAt.toIso8601String(),
      'message_count': messageCount,
      'is_read': isRead,
      'is_starred': isStarred,
      'folder_kind': folderKind,
      'labels': labels,
    };
  }
}
