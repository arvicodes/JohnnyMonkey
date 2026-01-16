#!/usr/bin/env python3
import sqlite3
import json

# Verbinde zur Datenbank
conn = sqlite3.connect('server/prisma/dev.db')
cursor = conn.cursor()

# Hole die Gruppe 7a
cursor.execute("SELECT id, name, seatingOrder FROM LearningGroup WHERE name LIKE '%7a%' LIMIT 1")
group = cursor.fetchone()

if not group:
    print("Keine Gruppe 7a gefunden")
    exit(1)

group_id, group_name, seating_order_json = group
print(f"\n🧹 BEREINIGUNG DER DESK-POSITIONEN FÜR: {group_name}")
print("═══════════════════════════════════════════════════════════════════════════════════════\n")

# Parse seatingOrder
seating_data = json.loads(seating_order_json)
student_order = seating_data.get('order', [])
desk_positions = seating_data.get('positions', [])

print(f"Anzahl Schüler in Reihenfolge: {len(student_order)}")
print(f"Anzahl Desk-Positionen (vorher): {len(desk_positions)}\n")

# Finde Duplikate - sowohl nach Grid-Position als auch nach Desk-ID
position_map = {}  # gridKey -> deskId
desk_id_map = {}  # deskId -> gridKey (erste Position)
duplicates = []
valid_positions = []

for pos in desk_positions:
    desk_id = pos.get('deskId')
    grid_row = pos.get('gridRow')
    grid_col = pos.get('gridCol')
    
    if desk_id is None or grid_row is None or grid_col is None:
        print(f"⚠️ Ungültige Position übersprungen: {pos}")
        continue
    
    grid_key = f"{grid_row}-{grid_col}"
    
    # Prüfe ob diese Grid-Position bereits belegt ist
    if grid_key in position_map:
        existing_desk = position_map[grid_key]
        print(f"⚠️ DUPLIKAT (Grid-Position): Desk {desk_id} an Position {grid_key} (bereits belegt von Desk {existing_desk})")
        duplicates.append(pos)
    # Prüfe ob dieser Desk bereits eine Position hat
    elif desk_id in desk_id_map:
        existing_pos = desk_id_map[desk_id]
        print(f"⚠️ DUPLIKAT (Desk-ID): Desk {desk_id} hat bereits Position {existing_pos}, neue Position {grid_key} wird ignoriert")
        duplicates.append(pos)
    else:
        position_map[grid_key] = desk_id
        desk_id_map[desk_id] = grid_key
        valid_positions.append(pos)

print(f"\nGefundene Duplikate: {len(duplicates)}")
print(f"Gültige Positionen: {len(valid_positions)}\n")

# Berechne benötigte Anzahl Tische
num_students = len(student_order)
num_desks_needed = (num_students + 1) // 2  # Aufrunden
print(f"Benötigte Anzahl Tische: {num_desks_needed}")

# Finde fehlende Desk-IDs
existing_desk_ids = set(pos['deskId'] for pos in valid_positions)
missing_desks = []
for desk_id in range(num_desks_needed):
    if desk_id not in existing_desk_ids:
        missing_desks.append(desk_id)

if missing_desks:
    print(f"Fehlende Desk-IDs: {missing_desks}")

# Finde freie Grid-Positionen
grid_cols = 4
grid_rows = 5
occupied_positions = set(position_map.keys())

free_positions = []
for row in range(grid_rows):
    for col in range(grid_cols):
        key = f"{row}-{col}"
        if key not in occupied_positions:
            free_positions.append((row, col))

print(f"Freie Grid-Positionen: {len(free_positions)}")

# Standard-Grid-Positionen für fehlende Desks
def get_default_grid_position(desk_index):
    if desk_index == 0:
        return (0, 0)
    if 1 <= desk_index <= 3:
        return (1, desk_index - 1)
    if 4 <= desk_index <= 7:
        return (2, desk_index - 4)
    if 8 <= desk_index <= 11:
        return (3, desk_index - 8)
    if 12 <= desk_index <= 15:
        return (4, desk_index - 12)
    # Fallback
    return (desk_index // grid_cols, desk_index % grid_cols)

# Füge fehlende Desks zu freien Positionen hinzu
for desk_id in missing_desks:
    # Versuche zuerst Standard-Position
    default_pos = get_default_grid_position(desk_id)
    default_key = f"{default_pos[0]}-{default_pos[1]}"
    
    if default_key not in occupied_positions:
        valid_positions.append({
            'deskId': desk_id,
            'gridRow': default_pos[0],
            'gridCol': default_pos[1]
        })
        position_map[default_key] = desk_id
        occupied_positions.add(default_key)
        print(f"✅ Desk {desk_id} zu Standard-Position {default_key} hinzugefügt")
    elif free_positions:
        # Verwende erste freie Position
        free_pos = free_positions.pop(0)
        free_key = f"{free_pos[0]}-{free_pos[1]}"
        valid_positions.append({
            'deskId': desk_id,
            'gridRow': free_pos[0],
            'gridCol': free_pos[1]
        })
        position_map[free_key] = desk_id
        occupied_positions.add(free_key)
        print(f"✅ Desk {desk_id} zu freier Position {free_key} hinzugefügt")

# Sortiere Positionen nach deskId für bessere Lesbarkeit
valid_positions.sort(key=lambda p: p['deskId'])

print(f"\n═══════════════════════════════════════════════════════════════════════════════════════")
print(f"BEREINIGTE POSITIONEN ({len(valid_positions)} Tische):")
print("═══════════════════════════════════════════════════════════════════════════════════════\n")

for pos in valid_positions:
    print(f"Desk {pos['deskId']:2d}: Grid R{pos['gridRow']+1}, C{pos['gridCol']+1}")

# Aktualisiere seatingOrder in der Datenbank
seating_data['positions'] = valid_positions
updated_seating_order = json.dumps(seating_data)

cursor.execute("""
    UPDATE LearningGroup 
    SET seatingOrder = ? 
    WHERE id = ?
""", (updated_seating_order, group_id))

conn.commit()

print(f"\n✅ Datenbank aktualisiert!")
print(f"═══════════════════════════════════════════════════════════════════════════════════════\n")

conn.close()
