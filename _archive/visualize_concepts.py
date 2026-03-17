#!/usr/bin/env python3
"""
Visualize concept relationships and density from articles_database.json
Run: python3 visualize_concepts.py
"""

import json
from collections import Counter
from itertools import combinations
from pathlib import Path

def load_database():
    db_path = Path(__file__).parent / "articles_database.json"
    with open(db_path, "r") as f:
        return json.load(f)

def build_concept_data(articles):
    """Extract concept frequencies and co-occurrences."""
    concept_freq = Counter()
    co_occurrences = Counter()
    concept_articles = {}  # Track which articles each concept appears in

    for article in articles:
        if article.get("fetch_status") == "unpublished":
            continue

        concepts = article.get("concepts", [])

        # Count frequencies
        for concept in concepts:
            concept_freq[concept] += 1
            if concept not in concept_articles:
                concept_articles[concept] = []
            concept_articles[concept].append(article["id"])

        # Count co-occurrences (pairs that appear together)
        for c1, c2 in combinations(sorted(concepts), 2):
            co_occurrences[(c1, c2)] += 1

    return concept_freq, co_occurrences, concept_articles

def print_frequency_chart(concept_freq):
    """Print horizontal bar chart of concept frequencies."""
    print("\n" + "="*70)
    print("CONCEPT FREQUENCY")
    print("="*70)

    max_count = max(concept_freq.values())
    max_label = max(len(c) for c in concept_freq.keys())

    for concept, count in concept_freq.most_common():
        bar_len = int((count / max_count) * 30)
        bar = "█" * bar_len + "░" * (30 - bar_len)
        print(f"{concept:<{max_label}} │{bar}│ {count}")

def print_co_occurrence_matrix(concept_freq, co_occurrences):
    """Print top co-occurring concept pairs."""
    print("\n" + "="*70)
    print("TOP CONCEPT CO-OCCURRENCES (appear together in articles)")
    print("="*70)

    for (c1, c2), count in co_occurrences.most_common(25):
        strength = "●" * count
        print(f"{count:>2}x │ {c1} ↔ {c2} {strength}")

def print_concept_clusters(concept_freq, co_occurrences):
    """Identify and print concept clusters based on co-occurrence."""
    print("\n" + "="*70)
    print("CONCEPT CLUSTERS (grouped by relatedness)")
    print("="*70)

    # Build adjacency for clustering
    adjacency = {}
    for (c1, c2), count in co_occurrences.items():
        if count >= 2:  # Only strong connections
            adjacency.setdefault(c1, []).append((c2, count))
            adjacency.setdefault(c2, []).append((c1, count))

    # Find clusters using simple connected components
    visited = set()
    clusters = []

    for concept in sorted(concept_freq.keys(), key=lambda x: -concept_freq[x]):
        if concept in visited:
            continue

        # BFS to find connected component
        cluster = []
        queue = [concept]
        while queue:
            c = queue.pop(0)
            if c in visited:
                continue
            visited.add(c)
            cluster.append(c)
            for neighbor, _ in adjacency.get(c, []):
                if neighbor not in visited:
                    queue.append(neighbor)

        if len(cluster) >= 2:
            clusters.append(cluster)

    # Print clusters
    for i, cluster in enumerate(clusters, 1):
        sorted_cluster = sorted(cluster, key=lambda x: -concept_freq[x])
        total = sum(concept_freq[c] for c in cluster)
        print(f"\nCluster {i} ({total} total mentions):")
        for c in sorted_cluster:
            print(f"  • {c} ({concept_freq[c]})")

def print_network_ascii(concept_freq, co_occurrences):
    """Print ASCII representation of concept network."""
    print("\n" + "="*70)
    print("CONCEPT NETWORK (top connections)")
    print("="*70)

    # Get top concepts by frequency
    top_concepts = [c for c, _ in concept_freq.most_common(12)]

    for concept in top_concepts:
        connections = []
        for (c1, c2), count in co_occurrences.items():
            if c1 == concept:
                connections.append((c2, count))
            elif c2 == concept:
                connections.append((c1, count))

        connections.sort(key=lambda x: -x[1])
        top_conn = connections[:4]

        if top_conn:
            conn_str = ", ".join(f"{c}({n})" for c, n in top_conn)
            print(f"\n┌─ {concept} [{concept_freq[concept]}]")
            for c, n in top_conn:
                print(f"├──{'─'*n}→ {c}")

def generate_html_visualization(concept_freq, co_occurrences):
    """Generate an interactive HTML visualization."""

    # Prepare nodes
    nodes = []
    for concept, count in concept_freq.most_common():
        nodes.append({
            "id": concept,
            "label": concept,
            "size": count * 3 + 10,
            "count": count
        })

    # Prepare edges
    edges = []
    for (c1, c2), count in co_occurrences.items():
        if count >= 1:
            edges.append({
                "from": c1,
                "to": c2,
                "width": count,
                "count": count
            })

    html = f'''<!DOCTYPE html>
<html>
<head>
    <title>Prediction Market Concepts Network</title>
    <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; background: #0a0a0a; color: #fff; }}
        #network {{ width: 100%; height: 70vh; border: 1px solid #333; }}
        h1 {{ text-align: center; padding: 20px; margin: 0; }}
        .stats {{ display: flex; justify-content: center; gap: 40px; padding: 10px; background: #111; }}
        .stat {{ text-align: center; }}
        .stat-num {{ font-size: 24px; font-weight: bold; color: #4ecdc4; }}
        .stat-label {{ font-size: 12px; color: #888; }}
        .legend {{ padding: 20px; background: #111; }}
        .legend h3 {{ margin: 0 0 10px 0; }}
        .legend-items {{ display: flex; flex-wrap: wrap; gap: 10px; }}
        .legend-item {{ background: #222; padding: 5px 10px; border-radius: 4px; font-size: 12px; }}
    </style>
</head>
<body>
    <h1>Prediction Market Concepts Network</h1>
    <div class="stats">
        <div class="stat"><div class="stat-num">{len(nodes)}</div><div class="stat-label">Unique Concepts</div></div>
        <div class="stat"><div class="stat-num">{sum(concept_freq.values())}</div><div class="stat-label">Total Mentions</div></div>
        <div class="stat"><div class="stat-num">{len(edges)}</div><div class="stat-label">Connections</div></div>
    </div>
    <div id="network"></div>
    <div class="legend">
        <h3>Top Concepts by Frequency</h3>
        <div class="legend-items">
            {"".join(f'<div class="legend-item">{c} ({n})</div>' for c, n in concept_freq.most_common(15))}
        </div>
    </div>
    <script>
        var nodes = new vis.DataSet({json.dumps(nodes)});
        var edges = new vis.DataSet({json.dumps(edges)});

        var container = document.getElementById('network');
        var data = {{ nodes: nodes, edges: edges }};
        var options = {{
            nodes: {{
                shape: 'dot',
                font: {{ color: '#fff', size: 12 }},
                color: {{
                    background: '#4ecdc4',
                    border: '#2a9d8f',
                    highlight: {{ background: '#ff6b6b', border: '#c92a2a' }}
                }}
            }},
            edges: {{
                color: {{ color: '#555', highlight: '#888' }},
                smooth: {{ type: 'continuous' }}
            }},
            physics: {{
                barnesHut: {{
                    gravitationalConstant: -3000,
                    centralGravity: 0.3,
                    springLength: 150
                }}
            }},
            interaction: {{
                hover: true,
                tooltipDelay: 100
            }}
        }};

        var network = new vis.Network(container, data, options);
    </script>
</body>
</html>'''

    output_path = Path(__file__).parent / "concepts_network.html"
    with open(output_path, "w") as f:
        f.write(html)

    return output_path

def main():
    articles = load_database()
    concept_freq, co_occurrences, concept_articles = build_concept_data(articles)

    total_articles = len([a for a in articles if a.get("fetch_status") != "unpublished"])

    print(f"\n{'='*70}")
    print(f"CONCEPT ANALYSIS - {total_articles} articles, {len(concept_freq)} unique concepts")
    print(f"{'='*70}")

    print_frequency_chart(concept_freq)
    print_co_occurrence_matrix(concept_freq, co_occurrences)
    print_concept_clusters(concept_freq, co_occurrences)
    print_network_ascii(concept_freq, co_occurrences)

    # Generate HTML
    html_path = generate_html_visualization(concept_freq, co_occurrences)
    print(f"\n{'='*70}")
    print(f"INTERACTIVE VISUALIZATION")
    print(f"{'='*70}")
    print(f"Generated: {html_path}")
    print("Open in browser for interactive network graph")

if __name__ == "__main__":
    main()
