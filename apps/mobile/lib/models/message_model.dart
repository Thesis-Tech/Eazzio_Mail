class MessageModel {
  final String id;
  final String mailboxId;
  final String threadId;
  final String fromAddress;
  final List<String> toAddresses;
  final String subject;
  final String snippet;
  final String bodyText;
  final String bodyHtml;
  final DateTime receivedAt;
  final bool isRead;
  final bool isStarred;
  final List<String> attachments;
  final Map<String, dynamic> securityVerdicts;

  const MessageModel({
    required this.id,
    required this.mailboxId,
    required this.threadId,
    required this.fromAddress,
    required this.toAddresses,
    required this.subject,
    required this.snippet,
    required this.bodyText,
    this.bodyHtml = '',
    required this.receivedAt,
    this.isRead = false,
    this.isStarred = false,
    this.attachments = const [],
    this.securityVerdicts = const {},
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) {
    return MessageModel(
      id: json['id'] as String? ?? '',
      mailboxId: json['mailbox_id'] as String? ?? json['mailboxId'] as String? ?? '',
      threadId: json['thread_id'] as String? ?? json['threadId'] as String? ?? '',
      fromAddress: json['from_address'] as String? ?? json['from'] as String? ?? '',
      toAddresses: (json['to'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      subject: json['subject'] as String? ?? 'No Subject',
      snippet: json['snippet'] as String? ?? '',
      bodyText: json['body_text'] as String? ?? json['bodyText'] as String? ?? json['snippet'] as String? ?? '',
      bodyHtml: json['body_html'] as String? ?? json['bodyHtml'] as String? ?? '',
      receivedAt: json['received_at'] != null
          ? DateTime.tryParse(json['received_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
      isRead: json['is_read'] as bool? ?? false,
      isStarred: json['is_starred'] as bool? ?? false,
      attachments: (json['attachments'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      securityVerdicts: json['security_verdicts'] as Map<String, dynamic>? ?? {},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'mailbox_id': mailboxId,
      'thread_id': threadId,
      'from_address': fromAddress,
      'to': toAddresses,
      'subject': subject,
      'snippet': snippet,
      'body_text': bodyText,
      'body_html': bodyHtml,
      'received_at': receivedAt.toIso8601String(),
      'is_read': isRead,
      'is_starred': isStarred,
      'attachments': attachments,
      'security_verdicts': securityVerdicts,
    };
  }
}
