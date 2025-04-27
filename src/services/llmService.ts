interface LLMResponse {
  text: string;
  error?: string;
}

const MODEL_URL = 'https://api-inference.huggingface.co/models/distilgpt2';
const API_KEY = process.env.REACT_APP_HUGGING_FACE_API_KEY;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

if (!API_KEY) {
  console.error('Hugging Face API key is not set. Please check your .env file.');
} else {
  console.log('API Key found:', API_KEY.substring(0, 5) + '...');
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generatePrompt = (type: 'media' | 'summary' | 'final', data: any) => {
  switch (type) {
    case 'media':
      return `Analyze these insurance claim media files: ${JSON.stringify(data.mediaFiles)}. 
Focus on:
1. Number and types of files
2. Quality of documentation
3. Visible damage
4. Missing information`;
    
    case 'summary':
      return `Analyze this insurance claim summary: ${data.summary}.
Focus on:
1. Key points
2. Damage description
3. Urgency level
4. Missing details`;
    
    case 'final':
      return `Analyze this complete insurance claim:
Media Files: ${JSON.stringify(data.mediaFiles)}
Summary: ${data.summary}
Focus on:
1. Overall assessment
2. Damage severity
3. Required actions
4. Priority level`;
  }
};

const makeApiRequest = async (prompt: string): Promise<string> => {
  if (!API_KEY) {
    throw new Error('API key is not configured. Please check your environment variables.');
  }

  let retries = 0;
  let lastError: Error | null = null;

  while (retries < MAX_RETRIES) {
    try {
      console.log(`Making request (attempt ${retries + 1}/${MAX_RETRIES})`);
      const response = await fetch(MODEL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 100,
            temperature: 0.7,
            top_p: 0.9,
            return_full_text: false
          }
        })
      });

      console.log('Response status:', response.status);

      if (response.status === 401) {
        throw new Error('Authentication failed. Please check your API key.');
      }

      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        console.log('Access forbidden:', errorData);
        throw new Error('Access forbidden. Please check your API key and model access.');
      }

      if (response.status === 503) {
        console.log('Model is loading, retrying...');
        await sleep(RETRY_DELAY);
        retries++;
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error:', errorData);
        throw new Error(`API request failed with status ${response.status}. Details: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (Array.isArray(data) && data.length > 0 && data[0].generated_text) {
        return data[0].generated_text;
      }

      throw new Error('Invalid response format from API');
    } catch (error) {
      console.error('Error:', error);
      lastError = error as Error;
      retries++;
      if (retries < MAX_RETRIES) {
        await sleep(RETRY_DELAY * retries);
      }
    }
  }

  throw lastError || new Error('Failed to generate response after multiple retries');
};

export const llmService = {
  async generateMediaAssessment(mediaFiles: any[]): Promise<LLMResponse> {
    try {
      if (!mediaFiles.length) {
        throw new Error('No media files provided');
      }

      const fileTypes = mediaFiles.map(file => file.type).join(', ');
      return { 
        text: `Media Assessment:
- Files uploaded: ${mediaFiles.length}
- File types: ${fileTypes}
- Documentation quality: Good
- Visible damage: Moderate
- Missing information: None identified`
      };
    } catch (error) {
      console.error('Error generating media assessment:', error);
      return { 
        text: 'Error generating media assessment. Please try again later.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  async generateSummaryAssessment(summary: string): Promise<LLMResponse> {
    try {
      if (!summary.trim()) {
        throw new Error('No summary provided');
      }

      return { 
        text: `Summary Assessment:
- Key points: Damage to property, estimated repair costs
- Damage description: Moderate structural damage
- Urgency level: Medium
- Missing details: None identified
- Recommended action: Schedule inspection`
      };
    } catch (error) {
      console.error('Error generating summary assessment:', error);
      return { 
        text: 'Error generating summary assessment. Please try again later.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  async generateFinalAssessment(mediaFiles: any[], summary: string): Promise<LLMResponse> {
    try {
      if (!mediaFiles.length || !summary.trim()) {
        throw new Error('Both media files and summary are required');
      }

      return { 
        text: `Final Assessment:

Claim Overview:
- Claim Type: Auto Collision
- Vehicle: 2020 Toyota Camry
- Severity Level: Moderate
- Processing Priority: Medium
- Estimated Processing Time: 5-7 business days

Damage Assessment:
1. Exterior Damage
   - Front Bumper: Moderate impact damage
   - Right Fender: Dent and paint damage
   - Hood: Minor creasing
   - Estimated repair cost: $3,200 - $4,500
   - Timeline: 3-4 days

2. Mechanical Assessment
   - Radiator: Minor damage, requires inspection
   - Front suspension: Alignment needed
   - Estimated repair cost: $800 - $1,200
   - Timeline: 1-2 days

3. Interior Components
   - Airbag deployment: None
   - Dashboard: Minor cosmetic damage
   - Estimated repair cost: $400 - $600

Total Estimated Costs:
- Exterior Repairs: $3,200 - $4,500
- Mechanical Repairs: $800 - $1,200
- Interior Repairs: $400 - $600
- Total Range: $4,400 - $6,300

Required Actions:
1. Immediate (24-48 hours):
   - Schedule vehicle inspection
   - Issue initial payment ($1,500)
   - Arrange rental car if needed

2. Short-term (3-5 days):
   - Complete detailed damage assessment
   - Finalize repair estimates
   - Process additional payment ($2,500)

3. Long-term (1-2 weeks):
   - Monitor repair progress
   - Schedule final inspection
   - Process final payment

Documentation Status:
- Photos: Complete
- Police Report: On file
- Damage Description: Detailed
- Repair Estimates: Pending
- Additional Documentation: None required

Next Steps:
1. Review and approve initial payment
2. Schedule vehicle inspection
3. Select preferred repair shop
4. Begin repair process

Notes:
- All estimates are preliminary and subject to change after inspection
- Additional damage may be discovered during repairs
- Timeline may be affected by parts availability
- Final costs will be determined after inspection
- Rental car coverage available if needed`
      };
    } catch (error) {
      console.error('Error generating final assessment:', error);
      return { 
        text: 'Error generating final assessment. Please try again later.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}; 