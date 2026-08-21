import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/mailbox_provider.dart';
import '../theme/app_theme.dart';

class ComposeScreen extends StatefulWidget {
  final String? initialTo;
  final String? initialSubject;
  final String? initialBody;

  const ComposeScreen({
    super.key,
    this.initialTo,
    this.initialSubject,
    this.initialBody,
  });

  @override
  State<ComposeScreen> createState() => _ComposeScreenState();
}

class _ComposeScreenState extends State<ComposeScreen> {
  final _toController = TextEditingController();
  final _subjectController = TextEditingController();
  final _bodyController = TextEditingController();
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialTo != null) _toController.text = widget.initialTo!;
    if (widget.initialSubject != null) _subjectController.text = widget.initialSubject!;
    if (widget.initialBody != null) _bodyController.text = widget.initialBody!;
  }

  @override
  void dispose() {
    _toController.dispose();
    _subjectController.dispose();
    _bodyController.dispose();
    super.dispose();
  }

  Future<void> _handleSend() async {
    final to = _toController.text.trim();
    final subject = _subjectController.text.trim();
    final body = _bodyController.text.trim();

    if (to.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter at least one recipient address')),
      );
      return;
    }

    setState(() => _isSending = true);
    final mailboxProvider = Provider.of<MailboxProvider>(context, listen: false);

    final success = await mailboxProvider.sendEmail(
      to: [to],
      subject: subject.isEmpty ? 'No Subject' : subject,
      bodyText: body,
    );

    if (mounted) {
      setState(() => _isSending = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Email sent successfully'),
            backgroundColor: AppTheme.success,
          ),
        );
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to send email. Stored as local draft.'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.darkBackground,
      appBar: AppBar(
        title: const Text('Compose', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.attach_file, color: AppTheme.darkTextSecondary),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Attachment picker opened')),
              );
            },
          ),
          _isSending
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppTheme.primary,
                      ),
                    ),
                  ),
                )
              : IconButton(
                  key: const Key('send_button'),
                  icon: const Icon(Icons.send, color: AppTheme.primary),
                  onPressed: _handleSend,
                ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              key: const Key('compose_to_input'),
              controller: _toController,
              keyboardType: TextInputType.emailAddress,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: const InputDecoration(
                labelText: 'To',
                labelStyle: TextStyle(color: AppTheme.darkTextSecondary),
                enabledBorder: UnderlineInputBorder(
                  borderSide: BorderSide(color: AppTheme.darkBorder),
                ),
                focusedBorder: UnderlineInputBorder(
                  borderSide: BorderSide(color: AppTheme.primary),
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              key: const Key('compose_subject_input'),
              controller: _subjectController,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: const InputDecoration(
                labelText: 'Subject',
                labelStyle: TextStyle(color: AppTheme.darkTextSecondary),
                enabledBorder: UnderlineInputBorder(
                  borderSide: BorderSide(color: AppTheme.darkBorder),
                ),
                focusedBorder: UnderlineInputBorder(
                  borderSide: BorderSide(color: AppTheme.primary),
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              key: const Key('compose_body_input'),
              controller: _bodyController,
              maxLines: 15,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: const InputDecoration(
                hintText: 'Compose email...',
                hintStyle: TextStyle(color: AppTheme.darkTextSecondary),
                border: InputBorder.none,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
