import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { FolderOpen, File, Folder, Trash2, Edit, Plus } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface FileSystemPath {
  id: string;
  name: string;
  path: string;
  description?: string;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
}

interface FolderItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: string;
  size?: number;
  children?: FolderItem[];
}

interface FileSystemPathManagerProps {
  teacherId: string;
}

export const FileSystemPathManager: React.FC<FileSystemPathManagerProps> = ({ teacherId }) => {
  const [paths, setPaths] = useState<FileSystemPath[]>([]);
  const [selectedPath, setSelectedPath] = useState<FileSystemPath | null>(null);
  const [folderStructure, setFolderStructure] = useState<FolderItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPath, setEditingPath] = useState<FileSystemPath | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    path: '',
    description: ''
  });

  const { toast } = useToast();

  // Pfade laden
  const loadPaths = async () => {
    try {
      const response = await fetch(`/api/file-system-paths/teacher/${teacherId}`);
      if (response.ok) {
        const data = await response.json();
        setPaths(data);
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Fehler beim Laden der Dateipfade",
        variant: "destructive"
      });
    }
  };

  // Ordnerstruktur laden
  const loadFolderStructure = async (filePath: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/file-system-paths/structure/${encodeURIComponent(filePath)}`);
      if (response.ok) {
        const data = await response.json();
        setFolderStructure(data);
      } else {
        toast({
          title: "Fehler",
          description: "Fehler beim Laden der Ordnerstruktur",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Fehler beim Laden der Ordnerstruktur",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Neuen Pfad erstellen
  const createPath = async () => {
    if (!formData.name || !formData.path) {
      toast({
        title: "Fehler",
        description: "Name und Pfad sind erforderlich",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/file-system-paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          teacherId
        })
      });

      if (response.ok) {
        const newPath = await response.json();
        setPaths([newPath, ...paths]);
        setFormData({ name: '', path: '', description: '' });
        toast({
          title: "Erfolg",
          description: "Dateipfad erfolgreich erstellt"
        });
      } else {
        const error = await response.json();
        toast({
          title: "Fehler",
          description: error.error || "Fehler beim Erstellen des Dateipfads",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Fehler beim Erstellen des Dateipfads",
        variant: "destructive"
      });
    }
  };

  // Pfad aktualisieren
  const updatePath = async () => {
    if (!editingPath || !formData.name || !formData.path) return;

    try {
      const response = await fetch(`/api/file-system-paths/${editingPath.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedPath = await response.json();
        setPaths(paths.map(p => p.id === updatedPath.id ? updatedPath : p));
        setIsEditing(false);
        setEditingPath(null);
        setFormData({ name: '', path: '', description: '' });
        toast({
          title: "Erfolg",
          description: "Dateipfad erfolgreich aktualisiert"
        });
      } else {
        const error = await response.json();
        toast({
          title: "Fehler",
          description: error.error || "Fehler beim Aktualisieren des Dateipfads",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Fehler beim Aktualisieren des Dateipfads",
        variant: "destructive"
      });
    }
  };

  // Pfad löschen
  const deletePath = async (id: string) => {
    if (!window.confirm('Möchten Sie diesen Dateipfad wirklich löschen?')) return;

    try {
      const response = await fetch(`/api/file-system-paths/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setPaths(paths.filter(p => p.id !== id));
        if (selectedPath?.id === id) {
          setSelectedPath(null);
          setFolderStructure(null);
        }
        toast({
          title: "Erfolg",
          description: "Dateipfad erfolgreich gelöscht"
        });
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Fehler beim Löschen des Dateipfads",
        variant: "destructive"
      });
    }
  };

  // Bearbeitung starten
  const startEditing = (path: FileSystemPath) => {
    setEditingPath(path);
    setFormData({
      name: path.name,
      path: path.path,
      description: path.description || ''
    });
    setIsEditing(true);
  };

  // Bearbeitung abbrechen
  const cancelEditing = () => {
    setIsEditing(false);
    setEditingPath(null);
    setFormData({ name: '', path: '', description: '' });
  };

  // Pfad auswählen
  const selectPath = (path: FileSystemPath) => {
    setSelectedPath(path);
    loadFolderStructure(path.path);
  };

  // Ordnerstruktur rendern
  const renderFolderItem = (item: FolderItem, depth: number = 0) => {
    const indent = depth * 20;
    
    return (
      <div key={item.path} style={{ marginLeft: indent }}>
        <div className="flex items-center gap-2 py-1 hover:bg-gray-100 rounded px-2">
          {item.type === 'directory' ? (
            <Folder className="w-4 h-4 text-blue-500" />
          ) : (
            <File className="w-4 h-4 text-gray-500" />
          )}
          <span className="text-sm">
            {item.name}
            {item.type === 'file' && item.extension && (
              <span className="text-gray-500 ml-1">({item.extension})</span>
            )}
            {item.type === 'file' && item.size && (
              <span className="text-gray-400 ml-2 text-xs">
                ({(item.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </span>
        </div>
        {item.children && item.children.length > 0 && (
          <div>
            {item.children.map(child => renderFolderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    loadPaths();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Dateisystem-Pfad verwalten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. Unterrichtsmaterial Informatik"
              />
            </div>
            <div>
              <Label htmlFor="path">Absoluter Pfad *</Label>
              <Input
                id="path"
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                placeholder="/Users/username/Documents/Unterricht"
              />
            </div>
            <div>
              <Label htmlFor="description">Beschreibung</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optionale Beschreibung"
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            {isEditing ? (
              <>
                <Button onClick={updatePath} className="flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Aktualisieren
                </Button>
                <Button variant="outline" onClick={cancelEditing}>
                  Abbrechen
                </Button>
              </>
            ) : (
              <Button onClick={createPath} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Pfad hinzufügen
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gespeicherte Pfade */}
      {paths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gespeicherte Pfade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paths.map((path) => (
                <Card key={path.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-sm">{path.name}</h4>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(path)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deletePath(path.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 font-mono break-all">
                      {path.path}
                    </p>
                    {path.description && (
                      <p className="text-xs text-gray-500 mb-3">{path.description}</p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectPath(path)}
                      className="w-full"
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Vorschau anzeigen
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ordnerstruktur-Vorschau */}
      {selectedPath && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="w-5 h-5" />
              Vorschau: {selectedPath.name}
            </CardTitle>
            <p className="text-sm text-gray-600 font-mono">{selectedPath.path}</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-gray-600">Lade Ordnerstruktur...</p>
              </div>
            ) : folderStructure ? (
              <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                {renderFolderItem(folderStructure)}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Keine Ordnerstruktur verfügbar
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
