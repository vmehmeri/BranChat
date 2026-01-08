import { Shield, Check, AlertTriangle, ExternalLink } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Privacy() {
  return (
    <AppLayout>
      <div className="h-full overflow-y-auto p-6 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Privacy</h1>
            <p className="text-muted-foreground mt-1">
              How BranChat protects your data
            </p>
          </div>

          {/* Why API Access is More Private */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Your Data, Your Control
              </CardTitle>
              <CardDescription>
                Using API keys offers stronger privacy than consumer AI products
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                When you use consumer AI products like ChatGPT, Gemini, or Claude.ai, your conversations
                may be used to improve those services, including training future AI models. By using
                BranChat with your own API keys, you get a fundamentally different privacy arrangement.
              </p>

              <div className="space-y-3 mt-4">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">No Training on Your Data</p>
                    <p className="text-sm text-muted-foreground">
                      API providers contractually commit to not using your API data to train their models.
                      This is a key distinction from free consumer tiers.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Data Retention Limits</p>
                    <p className="text-sm text-muted-foreground">
                      API providers typically retain data only for abuse monitoring purposes and for
                      limited time periods (usually 30 days or less), then delete it.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Local Storage</p>
                    <p className="text-sm text-muted-foreground">
                      BranChat stores your conversation history locally in your browser. Your data
                      never passes through anyone's servers - it goes directly from your browser to the AI provider.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Enterprise-Grade Terms</p>
                    <p className="text-sm text-muted-foreground">
                      API access is governed by business-oriented terms of service that prioritize
                      data protection and confidentiality.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Google Exception */}
          <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <AlertTitle className="text-yellow-500">Important: Google AI Free Tier Exception</AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              <p>
                Google's Gemini API has an important exception: the <strong>free tier</strong> may use
                your data for product improvement, including model training. This is different from
                OpenAI and Anthropic, which do not train on API data regardless of tier.
              </p>
              <p>
                To ensure your Google AI data is not used for training:
              </p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Go to the <a
                    href="https://console.cloud.google.com/billing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:no-underline inline-flex items-center gap-1"
                  >
                    Google Cloud Console Billing
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Enable billing for the project associated with your API key</li>
                <li>This switches you to the paid tier, where Google commits to not training on your data</li>
              </ol>
              <p className="text-sm text-muted-foreground mt-2">
                Note: You'll still only be charged for actual usage, but enabling billing changes the
                terms under which your data is handled.
              </p>
            </AlertDescription>
          </Alert>

          {/* Provider Links */}
          <Card>
            <CardHeader>
              <CardTitle>Provider Privacy Policies</CardTitle>
              <CardDescription>
                Read the official data usage policies from each provider
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <a
                  href="https://openai.com/policies/api-data-usage-policies"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">OpenAI API Data Usage Policy</p>
                    <p className="text-sm text-muted-foreground">
                      OpenAI does not train on API data
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>

                <a
                  href="https://www.anthropic.com/policies/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">Anthropic Privacy Policy</p>
                    <p className="text-sm text-muted-foreground">
                      Anthropic does not train on API data
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>

                <a
                  href="https://ai.google.dev/gemini-api/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">Google AI Terms of Service</p>
                    <p className="text-sm text-muted-foreground">
                      Paid tier excludes training; free tier may be used
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>

                <a
                  href="https://x.ai/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">xAI Privacy Policy</p>
                    <p className="text-sm text-muted-foreground">
                      xAI API data usage terms
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
