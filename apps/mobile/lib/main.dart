import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/mailbox_provider.dart';
import 'theme/app_theme.dart';
import 'screens/splash_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const EazzioMailApp());
}

class EazzioMailApp extends StatelessWidget {
  final AuthProvider? authProvider;
  final MailboxProvider? mailboxProvider;

  const EazzioMailApp({super.key, this.authProvider, this.mailboxProvider});

  @override
  Widget build(BuildContext context) {
    final app = MaterialApp(
      title: 'Eazzio Mail',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.dark,
      home: const SplashScreen(),
    );

    return MultiProvider(
      providers: [
        if (authProvider != null)
          ChangeNotifierProvider<AuthProvider>.value(value: authProvider!)
        else
          ChangeNotifierProvider<AuthProvider>(create: (_) => AuthProvider()),
        if (mailboxProvider != null)
          ChangeNotifierProvider<MailboxProvider>.value(value: mailboxProvider!)
        else
          ChangeNotifierProvider<MailboxProvider>(create: (_) => MailboxProvider()),
      ],
      child: app,
    );
  }
}
