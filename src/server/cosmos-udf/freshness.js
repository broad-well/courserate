function score(review) {
    function freshness() {
        const hours = (Date.now() - review.postTime) / 1000 / 60 / 60;
        const days = hours / 24;
    
        return 2 / Math.sqrt(days + 0.2);
    }

    return 7 * freshness() + 2 * review.qualityScore;
}