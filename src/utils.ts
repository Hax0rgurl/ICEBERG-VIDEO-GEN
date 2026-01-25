export async function withRetry<T>(fn: () => Promise<T>, maxRetries: number = 5, initialDelay: number = 2000): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Check if it's a rate limit error (429)
            const isRateLimit = error.status === 429 ||
                (error.message && error.message.includes('429')) ||
                (error.errorDetails && JSON.stringify(error.errorDetails).includes('Quota exceeded'));

            if (isRateLimit) {
                let delay = initialDelay * Math.pow(2, i);

                // Try to extract retryDelay from Gemini error structure
                if (error.errorDetails) {
                    const retryInfo = error.errorDetails.find((d: any) => d['@type']?.includes('RetryInfo'));
                    if (retryInfo && retryInfo.retryDelay) {
                        // retryDelay is often a string like "37s" or "37.5s"
                        const seconds = parseFloat(retryInfo.retryDelay);
                        if (!isNaN(seconds)) {
                            delay = seconds * 1000 + 1000; // Add 1s buffer
                        }
                    }
                }

                console.warn(`Rate limit hit. Waiting ${delay}ms before retry ${i + 1}/${maxRetries}...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}
