import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

interface RouteSelectorProps {
  onRouteSelect: (route: string) => void;
}

const routes = [
  {
    id: "easy",
    title: "Einfach",
    description: "Grundlagen der Informatik - perfekt für Einsteiger",
    points: "60 Punkte",
    difficulty: "⭐",
    color: "bg-green-50 border-green-200"
  },
  {
    id: "medium", 
    title: "Mittel",
    description: "Programmiertechniken und Algorithmen anwenden",
    points: "130 Punkte",
    difficulty: "⭐⭐",
    color: "bg-yellow-50 border-yellow-200"
  },
  {
    id: "hard",
    title: "Schwer",
    description: "Komplexe Algorithmen und Datenstrukturen implementieren",
    points: "260 Punkte", 
    difficulty: "⭐⭐⭐",
    color: "bg-red-50 border-red-200"
  }
];

export default function RouteSelector({ onRouteSelect }: RouteSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">GeoCaching Tour Lahnstein</h1>
          <p className="text-lg text-gray-600">Wähle deinen Schwierigkeitsgrad</p>
          <p className="text-sm text-gray-500 mt-2">Start: Johanniskirche • Alle Routen im 1km Radius</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {routes.map((route) => (
            <Card key={route.id} className={`${route.color} hover:shadow-lg transition-shadow cursor-pointer`}>
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <CardTitle className="text-xl">{route.title}</CardTitle>
                  <span className="text-2xl">{route.difficulty}</span>
                </div>
                <CardDescription className="text-sm">
                  {route.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700">Maximale Punkte:</p>
                  <p className="text-lg font-bold text-gray-900">{route.points}</p>
                </div>
                <Button 
                  onClick={() => onRouteSelect(route.id)}
                  className="w-full"
                  variant={route.id === "easy" ? "default" : route.id === "medium" ? "secondary" : "destructive"}
                >
                  Route wählen
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Was erwartet dich?</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">📍 Echte Standorte</span>
                <p>Historische Orte in Lahnstein</p>
              </div>
              <div>
                <span className="font-medium">🧩 Transferaufgaben</span>
                <p>Keine reinen Wissensfragen</p>
              </div>
              <div>
                <span className="font-medium">💡 Zwei Hinweise</span>
                <p>Pro Rätsel verfügbar</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}