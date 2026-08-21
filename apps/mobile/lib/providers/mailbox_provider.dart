import 'package:flutter/material.dart';
import '../models/thread_model.dart';
import '../models/message_model.dart';
import '../services/mailbox_service.dart';

class MailboxProvider extends ChangeNotifier {
  MailboxService _mailboxService;
  List<ThreadModel> _threads = [];
  Map<String, List<MessageModel>> _threadMessages = {};
  bool _isLoading = false;
  String _currentFolder = 'inbox';
  String _searchQuery = '';
  String? _error;

  MailboxProvider({MailboxService? mailboxService})
      : _mailboxService = mailboxService ?? MailboxService();

  List<ThreadModel> get threads {
    if (_searchQuery.isEmpty) {
      return _threads.where((t) => t.folderKind == _currentFolder).toList();
    }
    final q = _searchQuery.toLowerCase();
    return _threads.where((t) =>
        t.folderKind == _currentFolder &&
        (t.subject.toLowerCase().contains(q) ||
            t.sender.toLowerCase().contains(q) ||
            t.snippet.toLowerCase().contains(q))).toList();
  }

  List<ThreadModel> get allThreads => _threads;
  bool get isLoading => _isLoading;
  String get currentFolder => _currentFolder;
  String get searchQuery => _searchQuery;
  String? get error => _error;
  int get unreadCount => _threads.where((t) => !t.isRead && t.folderKind == 'inbox').length;

  void updateService(MailboxService service) {
    _mailboxService = service;
    notifyListeners();
  }

  void setFolder(String folder) {
    _currentFolder = folder;
    notifyListeners();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void setThreads(List<ThreadModel> threads) {
    _threads = List.from(threads);
    notifyListeners();
  }

  Future<void> loadThreads({required String mailboxId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final items = await _mailboxService.fetchThreads(
        mailboxId: mailboxId,
        folderKind: _currentFolder,
      );
      _threads = items;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<List<MessageModel>> loadThreadMessages({
    required String mailboxId,
    required String threadId,
  }) async {
    if (_threadMessages.containsKey(threadId)) {
      return _threadMessages[threadId]!;
    }

    try {
      final messages = await _mailboxService.fetchThreadMessages(
        mailboxId: mailboxId,
        threadId: threadId,
      );
      _threadMessages[threadId] = messages;
      notifyListeners();
      return messages;
    } catch (_) {
      return [];
    }
  }

  Future<bool> sendEmail({
    required List<String> to,
    required String subject,
    required String bodyText,
    String? bodyHtml,
  }) async {
    final success = await _mailboxService.sendMessage(
      to: to,
      subject: subject,
      bodyText: bodyText,
      bodyHtml: bodyHtml,
    );

    if (success) {
      // Add local optimistic thread to sent
      final newThread = ThreadModel(
        id: 'thread_${DateTime.now().millisecondsSinceEpoch}',
        mailboxId: 'primary',
        subject: subject,
        snippet: bodyText,
        sender: 'me',
        lastMessageAt: DateTime.now(),
        isRead: true,
        folderKind: 'sent',
      );
      _threads.insert(0, newThread);
      notifyListeners();
    }
    return success;
  }

  void toggleStar(String threadId) {
    final idx = _threads.indexWhere((t) => t.id == threadId);
    if (idx != -1) {
      final t = _threads[idx];
      _threads[idx] = t.copyWith(isStarred: !t.isStarred);
      notifyListeners();
      _mailboxService.updateThreadFlags(
        mailboxId: t.mailboxId,
        threadId: t.id,
        isStarred: !t.isStarred,
      );
    }
  }

  void markAsRead(String threadId, bool isRead) {
    final idx = _threads.indexWhere((t) => t.id == threadId);
    if (idx != -1) {
      final t = _threads[idx];
      _threads[idx] = t.copyWith(isRead: isRead);
      notifyListeners();
      _mailboxService.updateThreadFlags(
        mailboxId: t.mailboxId,
        threadId: t.id,
        isRead: isRead,
      );
    }
  }

  void archiveThread(String threadId) {
    final idx = _threads.indexWhere((t) => t.id == threadId);
    if (idx != -1) {
      final t = _threads[idx];
      _threads[idx] = t.copyWith(folderKind: 'archive');
      notifyListeners();
      _mailboxService.moveThread(
        mailboxId: t.mailboxId,
        threadId: t.id,
        targetFolder: 'archive',
      );
    }
  }

  void deleteThread(String threadId) {
    final idx = _threads.indexWhere((t) => t.id == threadId);
    if (idx != -1) {
      final t = _threads[idx];
      _threads[idx] = t.copyWith(folderKind: 'trash');
      notifyListeners();
      _mailboxService.moveThread(
        mailboxId: t.mailboxId,
        threadId: t.id,
        targetFolder: 'trash',
      );
    }
  }
}
