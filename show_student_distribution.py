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
print(f"\n📊 SCHÜLER-VERTEILUNG FÜR: {group_name}")
print("═══════════════════════════════════════════════════════════════════════════════════════\n")

# Parse seatingOrder
seating_data = json.loads(seating_order_json)
student_order = seating_data.get('order', [])
desk_positions = seating_data.get('positions', [])

# Hole alle Schüler der Gruppe
cursor.execute("""
    SELECT s.id, s.name 
    FROM User s 
    JOIN _StudentGroups lgts ON s.id = lgts.B 
    WHERE lgts.A = ?
    ORDER BY s.name
""", (group_id,))
students = cursor.fetchall()

# Erstelle Map: studentId → Student
student_map = {s[0]: s[1] for s in students}

# Sortiere Schüler nach seatingOrder
sorted_students = []
if student_order:
    for student_id in student_order:
        if student_id in student_map:
            sorted_students.append((student_id, student_map[student_id]))
    # Füge fehlende Schüler hinzu
    ordered_ids = set(student_order)
    for student_id, name in students:
        if student_id not in ordered_ids:
            sorted_students.append((student_id, name))
else:
    sorted_students = students

# Grid-System: 4x5 Kacheln (4 Spalten, 5 Zeilen)
grid_cols = 4
grid_rows = 5

def get_global_slot_number(slot_index, grid_row, grid_col):
    return (grid_row * grid_cols + grid_col) * 2 + slot_index + 1

# Erstelle Tische (Zweiergruppen)
desks = []
for i in range(0, len(sorted_students), 2):
    desks.append(sorted_students[i:i+2])

# Erstelle Grid-Map aus deskPositions
grid_map = {}
for pos in desk_positions:
    desk_id = pos.get('deskId')
    grid_row = pos.get('gridRow')
    grid_col = pos.get('gridCol')
    if desk_id is not None and grid_row is not None and grid_col is not None:
        key = f"{grid_row}-{grid_col}"
        # Warnung bei Duplikaten
        if key in grid_map:
            print(f"⚠️ WARNUNG: Duplikat in deskPositions - Position {key} wird mehrfach verwendet!")
        grid_map[key] = desk_id

# Erstelle detaillierte Slot-Liste
print("DETAILLIERTE SLOT-LISTE (zeilenweise, beginnt bei 1):")
print("═══════════════════════════════════════════════════════════════════════════════════════\n")

slot_list = []
for row in range(grid_rows):
    for col in range(grid_cols):
        grid_key = f"{row}-{col}"
        desk_id = grid_map.get(grid_key)
        
        if desk_id is not None and desk_id < len(desks):
            desk = desks[desk_id]
            for slot_index in range(2):
                global_slot = get_global_slot_number(slot_index, row, col)
                student = desk[slot_index] if slot_index < len(desk) else None
                student_name = student[1] if student else None
                slot_list.append({
                    'slot': global_slot,
                    'gridRow': row + 1,
                    'gridCol': col + 1,
                    'slotIndex': slot_index,
                    'deskId': desk_id,
                    'student': student_name
                })
        else:
            # Leere Zelle
            for slot_index in range(2):
                global_slot = get_global_slot_number(slot_index, row, col)
                slot_list.append({
                    'slot': global_slot,
                    'gridRow': row + 1,
                    'gridCol': col + 1,
                    'slotIndex': slot_index,
                    'deskId': None,
                    'student': None
                })

# Zeige alle Slots
for item in slot_list:
    student_str = item['student'] if item['student'] else '<LEER>'
    desk_str = f"Desk {item['deskId']}" if item['deskId'] is not None else 'Kein Desk'
    print(f"Slot {str(item['slot']).rjust(3)} (Grid R{item['gridRow']}, C{item['gridCol']}, Slot {item['slotIndex']}, {desk_str}): {student_str}")

# Prüfe Felder 2, 6 und 40
print("\n═══════════════════════════════════════════════════════════════════════════════════════")
print("PRÜFUNG: Felder 2, 6 und 40")
print("═══════════════════════════════════════════════════════════════════════════════════════\n")

field2 = next((s for s in slot_list if s['slot'] == 2), None)
field6 = next((s for s in slot_list if s['slot'] == 6), None)
field40 = next((s for s in slot_list if s['slot'] == 40), None)

if field2:
    print(f"Feld 2: {field2['student']} (Grid R{field2['gridRow']}, C{field2['gridCol']}, Slot {field2['slotIndex']}, Desk {field2['deskId']})")
else:
    print("Feld 2: NICHT GEFUNDEN")

if field6:
    print(f"Feld 6: {field6['student']} (Grid R{field6['gridRow']}, C{field6['gridCol']}, Slot {field6['slotIndex']}, Desk {field6['deskId']})")
else:
    print("Feld 6: NICHT GEFUNDEN")

if field40:
    print(f"Feld 40: {field40['student']} (Grid R{field40['gridRow']}, C{field40['gridCol']}, Slot {field40['slotIndex']}, Desk {field40['deskId']})")
else:
    print("Feld 40: NICHT GEFUNDEN")

# Prüfe Verknüpfungen
print("\nVERKNÜPFUNGS-ANALYSE:")
print("───────────────────────────────────────────────────────────────────────────────────────")

if field2 and field6 and field40:
    same_desk_2_6 = field2['deskId'] == field6['deskId'] and field2['deskId'] is not None
    same_desk_2_40 = field2['deskId'] == field40['deskId'] and field2['deskId'] is not None
    same_desk_6_40 = field6['deskId'] == field40['deskId'] and field6['deskId'] is not None
    
    same_row_2_6 = field2['gridRow'] == field6['gridRow']
    same_row_2_40 = field2['gridRow'] == field40['gridRow']
    same_row_6_40 = field6['gridRow'] == field40['gridRow']
    
    same_col_2_6 = field2['gridCol'] == field6['gridCol']
    same_col_2_40 = field2['gridCol'] == field40['gridCol']
    same_col_6_40 = field6['gridCol'] == field40['gridCol']
    
    print(f"Feld 2 und 6 - Gleicher Desk: {'JA' if same_desk_2_6 else 'NEIN'}, Gleiche Zeile: {'JA' if same_row_2_6 else 'NEIN'}, Gleiche Spalte: {'JA' if same_col_2_6 else 'NEIN'}")
    print(f"Feld 2 und 40 - Gleicher Desk: {'JA' if same_desk_2_40 else 'NEIN'}, Gleiche Zeile: {'JA' if same_row_2_40 else 'NEIN'}, Gleiche Spalte: {'JA' if same_col_2_40 else 'NEIN'}")
    print(f"Feld 6 und 40 - Gleicher Desk: {'JA' if same_desk_6_40 else 'NEIN'}, Gleiche Zeile: {'JA' if same_row_6_40 else 'NEIN'}, Gleiche Spalte: {'JA' if same_col_6_40 else 'NEIN'}")
    
    if same_desk_2_6:
        print(f"⚠️ Feld 2 und 6 sind im gleichen Desk ({field2['deskId']})")
    if same_desk_2_40:
        print(f"⚠️ Feld 2 und 40 sind im gleichen Desk ({field2['deskId']})")
    if same_desk_6_40:
        print(f"⚠️ Feld 6 und 40 sind im gleichen Desk ({field6['deskId']})")

print("\n═══════════════════════════════════════════════════════════════════════════════════════\n")

conn.close()
