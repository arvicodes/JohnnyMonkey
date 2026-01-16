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
print(f"\n🔄 RESET GRID FÜR: {group_name}")
print("═══════════════════════════════════════════════════════════════════════════════════════\n")

# Hole alle Schüler der Gruppe
cursor.execute("""
    SELECT s.id, s.name 
    FROM User s 
    JOIN _StudentGroups lgts ON s.id = lgts.B 
    WHERE lgts.A = ?
    ORDER BY s.name
""", (group_id,))
students = cursor.fetchall()

print(f"Anzahl Schüler: {len(students)}")
print(f"Schüler (alphabetisch): {', '.join([s[1] for s in students])}\n")

# Grid-System: 4 Spalten × 5 Zeilen = 20 Zellen, je 2 Slots = 40 Slots total
grid_cols = 4
grid_rows = 5

# Erstelle neue Reihenfolge: Alphabetisch sortiert
student_order = [s[0] for s in students]

# Erstelle Desk-Positionen: Zeilenweise von oben links nach unten rechts
# Desk 0 = Grid R0, C0 (Slot 1, 2)
# Desk 1 = Grid R0, C1 (Slot 3, 4)
# Desk 2 = Grid R0, C2 (Slot 5, 6)
# Desk 3 = Grid R0, C3 (Slot 7, 8)
# Desk 4 = Grid R1, C0 (Slot 9, 10)
# etc.
desk_positions = []
desk_id = 0

for row in range(grid_rows):
    for col in range(grid_cols):
        desk_positions.append({
            'deskId': desk_id,
            'gridRow': row,
            'gridCol': col
        })
        desk_id += 1

print(f"Anzahl Desk-Positionen: {len(desk_positions)}")
print(f"Anzahl benötigter Tische: {(len(students) + 1) // 2}\n")

# Erstelle neue seatingOrder
new_seating_order = {
    'order': student_order,
    'positions': desk_positions
}

# Speichere in Datenbank
updated_seating_order = json.dumps(new_seating_order)

cursor.execute("""
    UPDATE LearningGroup 
    SET seatingOrder = ? 
    WHERE id = ?
""", (updated_seating_order, group_id))

conn.commit()

print("✅ Grid zurückgesetzt!")
print(f"   - Schüler alphabetisch sortiert: {len(student_order)}")
print(f"   - Desk-Positionen erstellt: {len(desk_positions)}")
print(f"   - Grid: {grid_cols} Spalten × {grid_rows} Zeilen = {grid_cols * grid_rows} Zellen")
print(f"   - Slots: {grid_cols * grid_rows * 2} total\n")

# Zeige erste 10 Schüler
print("Erste 10 Schüler in Reihenfolge:")
for i, student_id in enumerate(student_order[:10]):
    student_name = next((s[1] for s in students if s[0] == student_id), student_id)
    desk_index = i // 2
    slot_index = i % 2
    if desk_index < len(desk_positions):
        pos = desk_positions[desk_index]
        slot_number = (pos['gridRow'] * grid_cols + pos['gridCol']) * 2 + slot_index + 1
        print(f"   {i+1}. {student_name} → Desk {desk_index}, Slot {slot_index}, Feld {slot_number} (Grid R{pos['gridRow']+1}, C{pos['gridCol']+1})")

print("\n═══════════════════════════════════════════════════════════════════════════════════════\n")

conn.close()
