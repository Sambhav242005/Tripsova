from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

_analyzer = None

def _get_analyzer():
    global _analyzer
    if _analyzer is None:
        _analyzer = SentimentIntensityAnalyzer()
    return _analyzer

def analyze_sentiment(text: str) -> dict:
    if not text or not text.strip():
        return {
            "compound": 0.0,
            "positive": 0.0,
            "neutral": 1.0,
            "negative": 0.0,
            "label": "NEUTRAL",
            "score": 50.0,
        }
    analyzer = _get_analyzer()
    scores = analyzer.polarity_scores(text)
    compound = scores["compound"]
    if compound >= 0.5:
        label = "POSITIVE"
    elif compound <= -0.5:
        label = "NEGATIVE"
    elif abs(compound) >= 0.05:
        label = "MIXED"
    else:
        label = "NEUTRAL"
    score = ((compound + 1) / 2) * 100
    return {
        "compound": compound,
        "positive": scores["pos"],
        "neutral": scores["neu"],
        "negative": scores["neg"],
        "label": label,
        "score": score,
    }

def sentiment_to_score(text: str) -> float:
    if not text or not text.strip():
        return 50.0
    result = analyze_sentiment(text)
    return result["score"]

def aggregate_sentiment(scores: list[float]) -> dict:
    if not scores:
        return {"score": 0.0, "magnitude": 0.0, "count": 0}
    n = len(scores)
    mean = sum(scores) / n
    if n == 1:
        magnitude = 0.0
    else:
        variance = sum((s - mean) ** 2 for s in scores) / n
        magnitude = variance ** 0.5
    return {"score": mean, "magnitude": magnitude, "count": n}
