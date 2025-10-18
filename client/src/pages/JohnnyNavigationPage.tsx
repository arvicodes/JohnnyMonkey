import React from 'react';
import { Link } from 'react-router-dom';

const JohnnyNavigationPage: React.FC = () => {
  const demoPages = [
    {
      path: '/johnny-demo',
      title: '🐒 Johnny Demo',
      description: 'Interaktive Demo mit Johnny Companion',
      features: ['Seiten-Kontext wechseln', 'Fortschritt simulieren', 'Interaktionen testen']
    },
    {
      path: '/quiz-player/demo',
      title: '🎯 Quiz mit Johnny',
      description: 'Quiz-Seite mit Johnny-Begleitung',
      features: ['3 Demo-Fragen', 'Automatisches Scoring', 'Johnny motiviert']
    },
    {
      path: '/flashcard-study',
      title: '📚 Karteikarten mit Johnny',
      description: 'Karteikarten lernen mit Johnny',
      features: ['5 Demo-Karten', 'Schwierigkeitsgrade', 'Fortschritt-Tracking']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🐒 Johnny Monkey - Lernbegleiter
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Entdecke alle Features des intelligenten Lernbegleiters
          </p>
          <div className="inline-flex items-center px-6 py-3 bg-orange-100 text-orange-800 rounded-full">
            <span className="text-2xl mr-2">🐒</span>
            <span className="font-medium">Johnny ist immer da, um dich zu motivieren!</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {demoPages.map((page, index) => (
            <Link
              key={index}
              to={page.path}
              className="group block bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
            >
              <div className="p-8">
                <div className="text-4xl mb-4">{page.title.split(' ')[0]}</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">
                  {page.title}
                </h3>
                <p className="text-gray-600 mb-6">
                  {page.description}
                </p>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-700 text-sm">Features:</h4>
                  <ul className="space-y-1">
                    {page.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="text-sm text-gray-600 flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 flex items-center text-blue-600 group-hover:text-blue-800 transition-colors">
                  <span className="font-medium">Demo starten</span>
                  <svg className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-16 bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            🎯 Was macht Johnny so besonders?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-3">🎭</div>
              <h3 className="font-semibold text-gray-800 mb-2">Intelligente Nachrichten</h3>
              <p className="text-sm text-gray-600">
                Johnny reagiert auf deine aktuelle Seite und Lernfortschritt
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-semibold text-gray-800 mb-2">Fortschritt-Tracking</h3>
              <p className="text-sm text-gray-600">
                Verfolgt Quizzes, Karteikarten und Lernserien automatisch
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl mb-3">🎉</div>
              <h3 className="font-semibold text-gray-800 mb-2">Motivation & Belohnung</h3>
              <p className="text-sm text-gray-600">
                Feiert Erfolge und motiviert bei schwierigen Momenten
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl mb-3">🔄</div>
              <h3 className="font-semibold text-gray-800 mb-2">Immer verfügbar</h3>
              <p className="text-sm text-gray-600">
                Johnny begleitet dich durch alle Lernaktivitäten
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center px-6 py-3 bg-green-100 text-green-800 rounded-full">
            <span className="text-2xl mr-2">🚀</span>
            <span className="font-medium">Bereit für deine Lernreise mit Johnny?</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JohnnyNavigationPage;
