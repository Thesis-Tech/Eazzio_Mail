import 'package:flutter/material.dart';

void main() {
  runApp(const EazzioMailApp());
}

class EazzioMailApp extends StatelessWidget {
  const EazzioMailApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Eazzio Mail',
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: const Color(0xFF2D5BFF),
        scaffoldBackgroundColor: const Color(0xFF0F1115),
      ),
      home: const Scaffold(
        body: Center(
          child: Text('Eazzio Mail Mobile'),
        ),
      ),
    );
  }
}
