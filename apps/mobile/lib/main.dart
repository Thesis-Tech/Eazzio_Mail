import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'theme/app_theme.dart';
import 'screens/splash_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const EazzioMailApp());
}

class EazzioMailApp extends StatelessWidget {
  final AuthProvider? authProvider;

  const EazzioMailApp({super.key, this.authProvider});

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

    if (authProvider != null) {
      return ChangeNotifierProvider<AuthProvider>.value(
        value: authProvider!,
        child: app,
      );
    }

    return ChangeNotifierProvider<AuthProvider>(
      create: (_) => AuthProvider(),
      child: app,
    );
  }
}
