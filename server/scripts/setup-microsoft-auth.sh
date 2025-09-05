#!/bin/bash

echo "🔐 Microsoft OneDrive Authentifizierung Setup"
echo "=============================================="
echo ""

# Check if credentials are already set
if [ -n "$MICROSOFT_USERNAME" ] && [ -n "$MICROSOFT_PASSWORD" ]; then
    echo "✅ Microsoft-Anmeldedaten sind bereits konfiguriert"
    echo "Benutzername: $MICROSOFT_USERNAME"
    echo ""
    read -p "Möchten Sie die Anmeldedaten ändern? (y/n): " change_creds
    if [ "$change_creds" != "y" ]; then
        echo "Setup abgebrochen."
        exit 0
    fi
fi

echo "📝 Bitte geben Sie Ihre Microsoft-Anmeldedaten ein:"
echo ""

# Get username
read -p "Microsoft-Benutzername (E-Mail): " username
if [ -z "$username" ]; then
    echo "❌ Benutzername darf nicht leer sein"
    exit 1
fi

# Get password
read -s -p "Microsoft-Passwort: " password
echo ""
if [ -z "$password" ]; then
    echo "❌ Passwort darf nicht leer sein"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    touch .env
fi

# Update or add credentials to .env file
if grep -q "MICROSOFT_USERNAME" .env; then
    sed -i '' "s/MICROSOFT_USERNAME=.*/MICROSOFT_USERNAME=$username/" .env
else
    echo "MICROSOFT_USERNAME=$username" >> .env
fi

if grep -q "MICROSOFT_PASSWORD" .env; then
    sed -i '' "s/MICROSOFT_PASSWORD=.*/MICROSOFT_PASSWORD=$password/" .env
else
    echo "MICROSOFT_PASSWORD=$password" >> .env
fi

echo ""
echo "✅ Microsoft-Anmeldedaten wurden gespeichert"
echo "📁 Gespeichert in: $(pwd)/.env"
echo ""
echo "🚀 Sie können jetzt die OneDrive-Integration testen!"
echo ""
echo "⚠️  WICHTIG: Die .env-Datei enthält sensible Daten."
echo "   Stellen Sie sicher, dass sie nicht in Git committed wird."
echo ""

# Check if .env is in .gitignore
if [ -f .gitignore ] && grep -q "\.env" .gitignore; then
    echo "✅ .env ist bereits in .gitignore"
else
    echo "📝 Füge .env zu .gitignore hinzu..."
    echo ".env" >> .gitignore
    echo "✅ .env wurde zu .gitignore hinzugefügt"
fi

echo ""
echo "🔄 Starten Sie den Server neu, um die neuen Anmeldedaten zu verwenden:"
echo "   npm run dev"

