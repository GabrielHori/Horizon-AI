import sys
try:
    from duckduckgo_search import DDGS
except ImportError:
    DDGS = None

class SearchService:
    def is_available(self):
        return DDGS is not None

    def search_web(self, query: str, max_results: int = 5):
        """Recherche sur le web et retourne un condensé des résultats."""
        try:
            if DDGS is None:
                return "Recherche web indisponible (dependance manquante)."
            print(f"DEBUG: Recherche web pour: {query}", file=sys.stderr)
            with DDGS() as ddgs:
                results = [r for r in ddgs.text(query, max_results=max_results)]
                if not results:
                    return "Aucun résultat trouvé sur le web."
                
                context = "\n--- RÉSULTATS WEB ---\n"
                for r in results:
                    context += f"Titre: {r['title']}\nLien: {r['href']}\nExtrait: {r['body']}\n\n"
                return context
        except Exception as e:
            print(f"Erreur de recherche: {e}", file=sys.stderr)
            return "Impossible d'accéder aux données web pour le moment."

search_service = SearchService()
