#!/usr/bin/env python3
"""
Tally field frequencies in articles_database.json
Run: python3 tally_fields.py
"""

import json
from collections import Counter
from pathlib import Path

def load_database():
    db_path = Path(__file__).parent / "articles_database.json"
    with open(db_path, "r") as f:
        return json.load(f)

def tally_fields(articles):
    # Initialize counters
    categories = Counter()
    content_types = Counter()
    difficulties = Counter()
    source_types = Counter()
    concepts = Counter()
    platforms = Counter()
    authors = Counter()
    fetch_statuses = Counter()

    for article in articles:
        # Skip unpublished articles
        if article.get("fetch_status") == "unpublished":
            continue

        # Count simple fields
        if article.get("primary_category"):
            categories[article["primary_category"]] += 1
        if article.get("content_type"):
            content_types[article["content_type"]] += 1
        if article.get("difficulty"):
            difficulties[article["difficulty"]] += 1
        if article.get("source_type"):
            source_types[article["source_type"]] += 1
        if article.get("author"):
            authors[article["author"]] += 1
        if article.get("fetch_status"):
            fetch_statuses[article["fetch_status"]] += 1

        # Count list fields
        for concept in article.get("concepts", []):
            concepts[concept] += 1
        for platform in article.get("platforms_mentioned", []):
            platforms[platform] += 1

    return {
        "primary_category": categories,
        "content_type": content_types,
        "difficulty": difficulties,
        "source_type": source_types,
        "concepts": concepts,
        "platforms_mentioned": platforms,
        "authors": authors,
        "fetch_status": fetch_statuses,
    }

def print_tally(name, counter, top_n=None):
    print(f"\n{'='*50}")
    print(f"{name.upper()} ({sum(counter.values())} total)")
    print('='*50)

    items = counter.most_common(top_n)
    max_label = max(len(str(item[0])) for item in items) if items else 0

    for label, count in items:
        bar = '█' * min(count, 30)
        print(f"{str(label):<{max_label}} : {count:>3} {bar}")

def main():
    articles = load_database()
    tallies = tally_fields(articles)

    total_articles = len([a for a in articles if a.get("fetch_status") != "unpublished"])
    print(f"\n📊 ARTICLE DATABASE TALLY")
    print(f"Total articles: {total_articles}")

    # Print each tally
    print_tally("Primary Category", tallies["primary_category"])
    print_tally("Content Type", tallies["content_type"])
    print_tally("Difficulty", tallies["difficulty"])
    print_tally("Source Type", tallies["source_type"])
    print_tally("Fetch Status", tallies["fetch_status"])
    print_tally("Platforms Mentioned", tallies["platforms_mentioned"])
    print_tally("Concepts (Top 20)", tallies["concepts"], top_n=20)
    print_tally("Authors (Top 15)", tallies["authors"], top_n=15)

    # Summary stats
    print(f"\n{'='*50}")
    print("SUMMARY")
    print('='*50)
    print(f"Unique categories: {len(tallies['primary_category'])}")
    print(f"Unique content types: {len(tallies['content_type'])}")
    print(f"Unique source types: {len(tallies['source_type'])}")
    print(f"Unique concepts: {len(tallies['concepts'])}")
    print(f"Unique platforms: {len(tallies['platforms_mentioned'])}")
    print(f"Unique authors: {len(tallies['authors'])}")

if __name__ == "__main__":
    main()
