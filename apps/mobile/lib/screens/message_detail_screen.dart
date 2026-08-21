import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/thread_model.dart';
import '../models/message_model.dart';
import '../providers/auth_provider.dart';
import '../providers/mailbox_provider.dart';
import '../theme/app_theme.dart';
import 'compose_screen.dart';

class MessageDetailScreen extends StatefulWidget {
  final ThreadModel thread;

  const MessageDetailScreen({super.key, required this.thread});

  @override
  State<MessageDetailScreen> createState() => _MessageDetailScreenState();
}

class _MessageDetailScreenState extends State<MessageDetailScreen> {
  late Future<List<MessageModel>> _messagesFuture;

  @override
  void initState() {
    super.initState();
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final mailbox = Provider.of<MailboxProvider>(context, listen: false);
    final mailboxId = auth.currentUser?.id ?? 'primary';
    _messagesFuture = mailbox.loadThreadMessages(
      mailboxId: mailboxId,
      threadId: widget.thread.id,
    );
  }

  @override
  Widget build(BuildContext context) {
    final mailboxProvider = Provider.of<MailboxProvider>(context);

    return Scaffold(
      backgroundColor: AppTheme.darkBackground,
      appBar: AppBar(
        title: Text(
          widget.thread.subject,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          IconButton(
            icon: Icon(
              widget.thread.isStarred ? Icons.star : Icons.star_border,
              color: widget.thread.isStarred ? Colors.amber : AppTheme.darkTextSecondary,
            ),
            onPressed: () => mailboxProvider.toggleStar(widget.thread.id),
          ),
          IconButton(
            icon: const Icon(Icons.archive_outlined, color: AppTheme.darkTextSecondary),
            onPressed: () {
              mailboxProvider.archiveThread(widget.thread.id);
              Navigator.pop(context);
            },
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, color: AppTheme.darkTextSecondary),
            onPressed: () {
              mailboxProvider.deleteThread(widget.thread.id);
              Navigator.pop(context);
            },
          ),
        ],
      ),
      body: FutureBuilder<List<MessageModel>>(
        future: _messagesFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: AppTheme.primary));
          }

          final messages = snapshot.data ?? [];
          if (messages.isEmpty) {
            // Fallback render single thread message
            return _buildSingleMessage(context, widget.thread);
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: messages.length,
            separatorBuilder: (_, __) => const SizedBox(height: 16),
            itemBuilder: (context, index) {
              return _buildMessageCard(context, messages[index]);
            },
          );
        },
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: const BoxDecoration(
            color: AppTheme.darkSurface,
            border: Border(top: BorderSide(color: AppTheme.darkBorder)),
          ),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  key: const Key('reply_button'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: AppTheme.darkBorder),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  icon: const Icon(Icons.reply, size: 18),
                  label: const Text('Reply'),
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => ComposeScreen(
                          initialTo: widget.thread.sender,
                          initialSubject: widget.thread.subject.startsWith('Re:')
                              ? widget.thread.subject
                              : 'Re: ${widget.thread.subject}',
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  key: const Key('forward_button'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: AppTheme.darkBorder),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  icon: const Icon(Icons.forward, size: 18),
                  label: const Text('Forward'),
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => ComposeScreen(
                          initialSubject: 'Fwd: ${widget.thread.subject}',
                          initialBody: '\n\n---------- Forwarded message ---------\nFrom: ${widget.thread.sender}\nSubject: ${widget.thread.subject}\n\n${widget.thread.snippet}',
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSingleMessage(BuildContext context, ThreadModel thread) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Card(
        color: AppTheme.darkSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AppTheme.darkBorder),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    backgroundColor: AppTheme.primary.withOpacity(0.2),
                    child: Text(
                      thread.sender.isNotEmpty ? thread.sender[0].toUpperCase() : '?',
                      style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          thread.sender,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        Text(
                          thread.lastMessageAt.toIso8601String().split('T')[0],
                          style: const TextStyle(color: AppTheme.darkTextSecondary, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const Divider(color: AppTheme.darkBorder, height: 24),
              Text(
                thread.snippet,
                style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.5),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMessageCard(BuildContext context, MessageModel msg) {
    return Card(
      color: AppTheme.darkSurface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppTheme.darkBorder),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: AppTheme.primary.withOpacity(0.2),
                  child: Text(
                    msg.fromAddress.isNotEmpty ? msg.fromAddress[0].toUpperCase() : '?',
                    style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        msg.fromAddress,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      Text(
                        'To: ${msg.toAddresses.join(', ')}',
                        style: const TextStyle(color: AppTheme.darkTextSecondary, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                Text(
                  msg.receivedAt.toIso8601String().split('T')[0],
                  style: const TextStyle(color: AppTheme.darkTextSecondary, fontSize: 11),
                ),
              ],
            ),
            const Divider(color: AppTheme.darkBorder, height: 24),
            Text(
              msg.bodyText.isNotEmpty ? msg.bodyText : msg.snippet,
              style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.5),
            ),
            if (msg.attachments.isNotEmpty) ...[
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                children: msg.attachments.map((att) {
                  return Chip(
                    backgroundColor: AppTheme.darkBackground,
                    avatar: const Icon(Icons.attach_file, size: 16, color: AppTheme.primary),
                    label: Text(att, style: const TextStyle(color: Colors.white, fontSize: 12)),
                  );
                }).toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
