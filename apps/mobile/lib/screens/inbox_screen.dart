import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/mailbox_provider.dart';
import '../models/thread_model.dart';
import '../theme/app_theme.dart';
import 'message_detail_screen.dart';
import 'compose_screen.dart';
import 'settings_screen.dart';
import 'login_screen.dart';

class InboxScreen extends StatefulWidget {
  const InboxScreen({super.key});

  @override
  State<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends State<InboxScreen> with SingleTickerProviderStateMixin {
  final TextEditingController _searchController = TextEditingController();
  bool _isSearching = false;
  String _selectedCategory = 'Primary';
  final Set<String> _selectedThreadIds = {};
  bool get _isBatchMode => _selectedThreadIds.isNotEmpty;

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

  void _showSnoozeBottomSheet(BuildContext context, String threadId) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.access_time_rounded, color: Color(0xFF14B8A6), size: 22),
                    SizedBox(width: 10),
                    Text('Snooze until...', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                  ],
                ),
                const SizedBox(height: 16),
                ListTile(
                  leading: const Icon(Icons.wb_sunny_outlined, color: Color(0xFF64748B)),
                  title: const Text('Later today (6:00 PM)', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                  onTap: () {
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Snoozed until 6:00 PM')));
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.wb_twilight_outlined, color: Color(0xFF64748B)),
                  title: const Text('Tomorrow morning (8:00 AM)', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                  onTap: () {
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Snoozed until tomorrow 8:00 AM')));
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.calendar_month_outlined, color: Color(0xFF64748B)),
                  title: const Text('Next week (Mon, 8:00 AM)', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                  onTap: () {
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Snoozed until next Monday')));
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final mailboxProvider = Provider.of<MailboxProvider>(context);
    final user = authProvider.currentUser;
    final threads = mailboxProvider.threads;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: _isBatchMode ? _buildBatchAppBar(mailboxProvider) : _buildStandardAppBar(authProvider, mailboxProvider),
      drawer: _buildFolderDrawer(context, mailboxProvider, user?.email ?? ''),
      body: Column(
        children: [
          if (mailboxProvider.currentFolder == 'inbox') _buildCategoryTabs(),
          Expanded(
            child: RefreshIndicator(
              color: const Color(0xFF14B8A6),
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
                      separatorBuilder: (_, __) => const Divider(height: 1, color: Color(0xFFE2E8F0)),
                      itemBuilder: (context, index) {
                        final thread = threads[index];
                        return _buildThreadCard(thread, mailboxProvider);
                      },
                    ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        key: const Key('compose_fab'),
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const ComposeScreen()),
          );
        },
        backgroundColor: const Color(0xFF14B8A6),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.edit_outlined),
        label: const Text('Compose', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }

  AppBar _buildBatchAppBar(MailboxProvider mailboxProvider) {
    return AppBar(
      backgroundColor: const Color(0xFF0F172A),
      foregroundColor: Colors.white,
      leading: IconButton(
        icon: const Icon(Icons.close),
        onPressed: () => setState(() => _selectedThreadIds.clear()),
      ),
      title: Text('${_selectedThreadIds.length} selected', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
      actions: [
        IconButton(
          icon: const Icon(Icons.archive_outlined),
          tooltip: 'Archive',
          onPressed: () {
            for (final id in _selectedThreadIds) {
              mailboxProvider.archiveThread(id);
            }
            setState(() => _selectedThreadIds.clear());
          },
        ),
        IconButton(
          icon: const Icon(Icons.delete_outline),
          tooltip: 'Delete',
          onPressed: () {
            for (final id in _selectedThreadIds) {
              mailboxProvider.deleteThread(id);
            }
            setState(() => _selectedThreadIds.clear());
          },
        ),
        IconButton(
          icon: const Icon(Icons.mark_email_read_outlined),
          tooltip: 'Mark as read',
          onPressed: () {
            for (final id in _selectedThreadIds) {
              mailboxProvider.markAsRead(id, true);
            }
            setState(() => _selectedThreadIds.clear());
          },
        ),
      ],
    );
  }

  AppBar _buildStandardAppBar(AuthProvider authProvider, MailboxProvider mailboxProvider) {
    return AppBar(
      backgroundColor: Colors.white,
      foregroundColor: const Color(0xFF0F172A),
      elevation: 0,
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(1.0),
        child: Container(color: const Color(0xFFE2E8F0), height: 1.0),
      ),
      title: _isSearching
          ? TextField(
              key: const Key('search_input'),
              controller: _searchController,
              autofocus: true,
              style: const TextStyle(color: Color(0xFF0F172A), fontSize: 16),
              decoration: const InputDecoration(
                hintText: 'Search in mail...',
                hintStyle: TextStyle(color: Color(0xFF94A3B8)),
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
                    color: const Color(0xFF14B8A6),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  alignment: Alignment.center,
                  child: const Text('E', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 10),
                Text(_getFolderTitle(mailboxProvider.currentFolder), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
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
          icon: const Icon(Icons.settings_outlined, size: 20),
          tooltip: 'Settings',
          onPressed: () {
            Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SettingsScreen()));
          },
        ),
        IconButton(
          key: const Key('logout_button'),
          icon: const Icon(Icons.logout, size: 20, color: Color(0xFF64748B)),
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
    );
  }

  Widget _buildCategoryTabs() {
    final categories = ['Primary', 'Social', 'Updates', 'Promotions'];
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: categories.map((cat) {
            final isSelected = _selectedCategory == cat;
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilterChip(
                selected: isSelected,
                label: Text(cat),
                labelStyle: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  color: isSelected ? Colors.white : const Color(0xFF475569),
                ),
                backgroundColor: const Color(0xFFF1F5F9),
                selectedColor: const Color(0xFF14B8A6),
                showCheckmark: false,
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide.none),
                onSelected: (_) => setState(() => _selectedCategory = cat),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildEmptyState(bool isLoading) {
    if (isLoading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF14B8A6)));
    }
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.mail_outline, size: 56, color: const Color(0xFFCBD5E1)),
          const SizedBox(height: 12),
          const Text('No messages here', style: TextStyle(color: Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          const Text('Your inbox is organized and up to date.', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildThreadCard(ThreadModel thread, MailboxProvider provider) {
    final isSelected = _selectedThreadIds.contains(thread.id);

    return Dismissible(
      key: Key('dismiss_${thread.id}'),
      background: Container(
        color: const Color(0xFF0F766E),
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: const Icon(Icons.archive_outlined, color: Colors.white),
      ),
      secondaryBackground: Container(
        color: const Color(0xFFDC2626),
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: const Icon(Icons.delete_outline, color: Colors.white),
      ),
      confirmDismiss: (direction) async {
        if (direction == DismissDirection.startToEnd) {
          provider.archiveThread(thread.id);
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Thread archived')));
          return true;
        } else {
          provider.deleteThread(thread.id);
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Thread deleted')));
          return true;
        }
      },
      child: InkWell(
        onLongPress: () {
          setState(() {
            if (isSelected) {
              _selectedThreadIds.remove(thread.id);
            } else {
              _selectedThreadIds.add(thread.id);
            }
          });
        },
        onTap: () {
          if (_isBatchMode) {
            setState(() {
              if (isSelected) {
                _selectedThreadIds.remove(thread.id);
              } else {
                _selectedThreadIds.add(thread.id);
              }
            });
          } else {
            provider.markAsRead(thread.id, true);
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => MessageDetailScreen(thread: thread),
              ),
            );
          }
        },
        child: Container(
          color: isSelected
              ? const Color(0xFFCCFBF1).withValues(alpha: 0.4)
              : (thread.isRead ? Colors.white : const Color(0xFFF0FDFA)),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GestureDetector(
                onTap: () {
                  setState(() {
                    if (isSelected) {
                      _selectedThreadIds.remove(thread.id);
                    } else {
                      _selectedThreadIds.add(thread.id);
                    }
                  });
                },
                child: CircleAvatar(
                  radius: 18,
                  backgroundColor: isSelected ? const Color(0xFF14B8A6) : const Color(0xFFE2E8F0),
                  child: isSelected
                      ? const Icon(Icons.check, size: 18, color: Colors.white)
                      : Text(
                          thread.sender.isNotEmpty ? thread.sender[0].toUpperCase() : '?',
                          style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            thread.sender,
                            style: TextStyle(
                              color: const Color(0xFF0F172A),
                              fontSize: 14,
                              fontWeight: thread.isRead ? FontWeight.w500 : FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text(
                          _formatDate(thread.lastMessageAt),
                          style: TextStyle(
                            color: thread.isRead ? const Color(0xFF94A3B8) : const Color(0xFF0F766E),
                            fontSize: 12,
                            fontWeight: thread.isRead ? FontWeight.normal : FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      thread.subject,
                      style: TextStyle(
                        color: const Color(0xFF0F172A),
                        fontSize: 13,
                        fontWeight: thread.isRead ? FontWeight.normal : FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      thread.snippet,
                      style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Column(
                children: [
                  IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    icon: Icon(
                      thread.isStarred ? Icons.star : Icons.star_border,
                      size: 20,
                      color: thread.isStarred ? Colors.amber : const Color(0xFFCBD5E1),
                    ),
                    onPressed: () => provider.toggleStar(thread.id),
                  ),
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: () => _showSnoozeBottomSheet(context, thread.id),
                    child: const Icon(Icons.schedule, size: 16, color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFolderDrawer(BuildContext context, MailboxProvider provider, String userEmail) {
    return Drawer(
      backgroundColor: Colors.white,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(color: Color(0xFF0F172A)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: const Color(0xFF14B8A6),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  alignment: Alignment.center,
                  child: const Text('E', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(height: 12),
                const Text('Eazzio Mail', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                Text(userEmail, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
              ],
            ),
          ),
          _drawerTile(Icons.inbox, 'Inbox', 'inbox', provider, context),
          _drawerTile(Icons.star_outline, 'Starred', 'starred', provider, context),
          _drawerTile(Icons.schedule, 'Snoozed', 'snoozed', provider, context),
          _drawerTile(Icons.send_outlined, 'Sent', 'sent', provider, context),
          _drawerTile(Icons.drafts_outlined, 'Drafts', 'drafts', provider, context),
          _drawerTile(Icons.archive_outlined, 'Archive', 'archive', provider, context),
          _drawerTile(Icons.report_gmailerrorred_outlined, 'Spam', 'spam', provider, context),
          _drawerTile(Icons.delete_outline, 'Trash', 'trash', provider, context),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.settings_outlined, color: Color(0xFF64748B)),
            title: const Text('Settings', style: TextStyle(color: Color(0xFF0F172A), fontSize: 14, fontWeight: FontWeight.w500)),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen()));
            },
          ),
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
      leading: Icon(icon, color: isSelected ? const Color(0xFF14B8A6) : const Color(0xFF64748B)),
      title: Text(
        title,
        style: TextStyle(
          color: isSelected ? const Color(0xFF0F766E) : const Color(0xFF0F172A),
          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
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

  String _getFolderTitle(String kind) {
    switch (kind) {
      case 'inbox':
        return 'Inbox';
      case 'sent':
        return 'Sent';
      case 'drafts':
        return 'Drafts';
      case 'starred':
        return 'Starred';
      case 'snoozed':
        return 'Snoozed';
      case 'archive':
        return 'Archive';
      case 'spam':
        return 'Spam';
      case 'trash':
        return 'Trash';
      default:
        return 'Mail';
    }
  }
}
