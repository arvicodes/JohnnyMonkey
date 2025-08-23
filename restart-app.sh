#!/bin/bash

echo "🔄 JohnnyMonkey App Neustart..."
echo "=================================="

# Alle laufenden Prozesse beenden
echo "🛑 Beende alle laufenden Prozesse..."
pkill -f "node.*server" 2>/dev/null
pkill -f "react-scripts" 2>/dev/null
pkill -f "ts-node" 2>/dev/null
pkill -f "nodemon" 2>/dev/null

# Kurz warten, damit alle Prozesse sauber beendet werden
sleep 2

# Überprüfen, ob noch Prozesse laufen
RUNNING_PROCESSES=$(ps aux | grep -E "(node.*server|react-scripts|ts-node|nodemon)" | grep -v grep)
if [ ! -z "$RUNNING_PROCESSES" ]; then
    echo "⚠️  Einige Prozesse laufen noch, erzwinge Beendigung..."
    pkill -9 -f "node.*server" 2>/dev/null
    pkill -9 -f "react-scripts" 2>/dev/null
    pkill -9 -f "ts-node" 2>/dev/null
    pkill -9 -f "nodemon" 2>/dev/null
    sleep 1
fi

echo "✅ Alle Prozesse beendet"

# Server starten
echo "🚀 Starte Server..."
cd server
npm run dev &
SERVER_PID=$!
echo "📡 Server läuft mit PID: $SERVER_PID"

# Kurz warten, damit der Server starten kann
sleep 3

# Client starten
echo "🌐 Starte Client..."
cd ../client
npm start &
CLIENT_PID=$!
echo "💻 Client läuft mit PID: $CLIENT_PID"

echo ""
echo "🎉 JohnnyMonkey App erfolgreich neu gestartet!"
echo "=============================================="
echo "📡 Server läuft auf Port 3001"
echo "💻 Client läuft auf Port 3003"
echo "🔗 Öffne http://localhost:3003 in deinem Browser"
echo ""
echo "💡 Tipp: Verwende 'ps aux | grep -E \"(node.*server|react-scripts)\"' um laufende Prozesse zu überprüfen"
echo "💡 Tipp: Verwende 'pkill -f \"node.*server\" && pkill -f \"react-scripts\"' um alle Prozesse zu beenden"
