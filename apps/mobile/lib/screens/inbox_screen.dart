import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/mailbox_provider.dart';
import '../models/thread_model.dart';
import '../theme/app_theme.dart';
import 'message_detail_screen.dart';
import 'compose_screen.dart';
import 'login_screen.dart';

class InboxScreen extends StatefulWidget {
  const InboxScreen({super.key});

  @override
  State<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends State<InboxScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final mailbox = Provider.of<MailboxProvider>(context, listen: false);
      if (auth.currentUser != null && mailbox.allThreads.isEmpty) {
        mailbox.loadThreads(mailboxId: auth.currentUser!.id);
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final mailboxProvider = Provider.of<MailboxProvider>(context);
    final user = authProvider.currentUser;
    final threads = mailboxProvider.threads;

    return Scaffold(
      backgroundColor: AppTheme.darkBackground,
      appBar: AppBar(
        title: _isSearching
            ? TextField(
                key: const Key('search_input'),
                controller: _searchController,
                autofocus: true,
                style: const TextStyle(color: Colors.white, fontSize: 16),
                decoration: const InputDecoration(
                  hintText: 'Search mail...',
                  hintStyle: TextStyle(color: AppTheme.darkTextSecondary),
                  border: InputBorder.none,
                ),
                onChanged: (val) => mailboxProvider.setSearchQuery(val),
              )
            : Row(
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    alignment: Alignment.center,
                    child: const Text(
                      'E',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    _getFolderTitle(mailboxProvider.currentFolder),
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
        actions: [
          IconButton(
            key: const Key('search_toggle_button'),
            icon: Icon(_isSearching ? Icons.close : Icons.search, size: 20),
            onPressed: () {
              setState(() {
                if (_isSearching) {
                  _searchController.clear();
                  mailboxProvider.setSearchQuery('');
                  _isSearching = false;
                } else {
                  _isSearching = true;
                }
              });
            },
          ),
          IconButton(
            key: const Key('logout_button'),
            icon: const Icon(Icons.logout, size: 20, color: AppTheme.darkTextSecondary),
            onPressed: () async {
              await authProvider.logout();
              if (context.mounted) {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                );
              }
            },
          ),
        ],
      ),
      drawer: _buildFolderDrawer(context, mailboxProvider, user?.email ?? ''),
      body: RefreshIndicator(
        onRefresh: () async {
          if (user != null) {
            await mailboxProvider.loadThreads(mailboxId: user.id);
          }
        },
        child: threads.isEmpty
            ? _buildEmptyState(mailboxProvider.isLoading)
            : ListView.separated(
                key: const Key('threads_list'),
                itemCount: threads.length,
                separatorBuilder: (_, __) => const Divider(
                  height: 1,
                  color: AppTheme.darkBorder,
                ),
                itemBuilder: (context, index) {
                  final thread = threads[index];
                  return _buildThreadTile(context, thread, mailboxProvider);
                },
              ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        key: const Key('compose_fab'),
        backgroundColor: AppTheme.primary,
        icon: const Icon(Icons.edit, color: Colors.white),
        label: const Text('Compose', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const ComposeScreen()),
          );
        },
      ),
    );
  }

  String _getFolderTitle(String folder) {
    switch (folder) {
      case 'inbox':
        return 'Inbox';
      case 'sent':
        return 'Sent';
      case 'drafts':
        return 'Drafts';
      case 'archive':
        return 'Archive';
      case 'trash':
        return 'Trash';
      default:
        return folder.toUpperCase();
    }
  }

  Widget _buildEmptyState(bool isLoading) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppTheme.primary));
    }
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.mail_outline, size: 56, color: AppTheme.darkTextSecondary.withOpacity(0.5)),
          const SizedBox(height: 16),
          const Text(
            'No messages here',
            style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          const Text(
            'Pull down to refresh',
            style: TextStyle(color: AppTheme.darkTextSecondary, fontSize: 13),
          ),
        ],
      ),
    );
  }

  Widget _buildThreadTile(BuildContext context, ThreadModel thread, MailboxProvider provider) {
    return Dismissible(
      key: Key('thread_${thread.id}'),
      background: Container(
        color: AppTheme.primary,
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.only(left: 20),
        child: const Icon(Icons.archive, color: Colors.white),
      ),
      secondaryBackground: Container(
        color: AppTheme.error,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: (direction) {
        if (direction == DismissDirection.startToEnd) {
          provider.archiveThread(thread.id);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Thread archived'), duration: Duration(seconds: 2)),
          );
        } else {
          provider.deleteThread(thread.id);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Thread moved to Trash'), duration: Duration(seconds: 2)),
          );
        }
      },
      child: ListTile(
        onTap: () {
          provider.markAsRead(thread.id, true);
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => MessageDetailScreen(thread: thread)),
          );
        },
        leading: CircleAvatar(
          backgroundColor: thread.isRead
              ? AppTheme.darkSurface
              : AppTheme.primary.withOpacity(0.2),
          child: Text(
            thread.sender.isNotEmpty ? thread.sender[0].toUpperCase() : '?',
            style: TextStyle(
              color: thread.isRead ? AppTheme.darkTextSecondary : AppTheme.primary,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        title: Row(
          children: [
            Expanded(
              child: Text(
                thread.sender,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: thread.isRead ? FontWeight.normal : FontWeight.bold,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Text(
              _formatDate(thread.lastMessageAt),
              style: TextStyle(
                color: thread.isRead ? AppTheme.darkTextSecondary : AppTheme.primary,
                fontSize: 12,
                fontWeight: thread.isRead ? FontWeight.normal : FontWeight.bold,
              ),
            ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 2),
            Text(
              thread.subject,
              style: TextStyle(
                color: thread.isRead ? AppTheme.darkTextPrimary : Colors.white,
                fontSize: 13,
                fontWeight: thread.isRead ? FontWeight.normal : FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              thread.snippet,
              style: const TextStyle(
                color: AppTheme.darkTextSecondary,
                fontSize: 12,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
        trailing: IconButton(
          icon: Icon(
            thread.isStarred ? Icons.star : Icons.star_border,
            size: 20,
            color: thread.isStarred ? Colors.amber : AppTheme.darkTextSecondary,
          ),
          onPressed: () => provider.toggleStar(thread.id),
        ),
      ),
    );
  }

  Widget _buildFolderDrawer(BuildContext context, MailboxProvider provider, String userEmail) {
    return Drawer(
      backgroundColor: AppTheme.darkBackground,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(color: AppTheme.darkSurface),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppTheme.primary,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  alignment: Alignment.center,
                  child: const Text(
                    'E',
                    style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Eazzio Mail',
                  style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                Text(
                  userEmail,
                  style: const TextStyle(color: AppTheme.darkTextSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
          _drawerTile(Icons.inbox, 'Inbox', 'inbox', provider, context),
          _drawerTile(Icons.send, 'Sent', 'sent', provider, context),
          _drawerTile(Icons.drafts, 'Drafts', 'drafts', provider, context),
          _drawerTile(Icons.archive, 'Archive', 'archive', provider, context),
          _drawerTile(Icons.delete, 'Trash', 'trash', provider, context),
        ],
      ),
    );
  }

  Widget _drawerTile(
    IconData icon,
    String title,
    String kind,
    MailboxProvider provider,
    BuildContext context,
  ) {
    final isSelected = provider.currentFolder == kind;
    return ListTile(
      leading: Icon(icon, color: isSelected ? AppTheme.primary : AppTheme.darkTextSecondary),
      title: Text(
        title,
        style: TextStyle(
          color: isSelected ? AppTheme.primary : Colors.white,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      selected: isSelected,
      onTap: () {
        provider.setFolder(kind);
        Navigator.pop(context);
      },
    );
  }

  String _formatDate(DateTime dt) {
    final now = DateTime.now();
    if (dt.day == now.day && dt.month == now.month && dt.year == now.year) {
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    }
    return '${dt.day}/${dt.month}';
  }
}
