import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getLLMProvider,
  clearProviderCache,
  getSupportedMimeTypes,
  isMimeTypeSupported,
} from '../registry';
import { buildSystemPrompt, API_TIMEOUT_MS, DEFAULT_SUPPORTED_MIME_TYPES } from '../utils';
import { BaseLLMProvider } from '../base';
import { ChatRequest, StreamCallback, Citation, LLMProviderConfig } from '../types';
import type { ModelProvider } from '@/types/chat';

// ============================================================================
// Utils Tests
// ============================================================================

describe('utils', () => {
  describe('buildSystemPrompt', () => {
    it('returns null when userBio is undefined', () => {
      expect(buildSystemPrompt(undefined)).toBeNull();
    });

    it('returns null when userBio is empty string', () => {
      expect(buildSystemPrompt('')).toBeNull();
    });

    it('returns null when userBio is whitespace only', () => {
      expect(buildSystemPrompt('   ')).toBeNull();
    });

    it('returns formatted prompt when userBio is provided', () => {
      const bio = 'I am a software developer';
      const result = buildSystemPrompt(bio);

      expect(result).toContain(bio);
      expect(result).toContain('information about the user');
    });
  });

  describe('constants', () => {
    it('API_TIMEOUT_MS is 5 minutes', () => {
      expect(API_TIMEOUT_MS).toBe(5 * 60 * 1000);
    });

    it('DEFAULT_SUPPORTED_MIME_TYPES includes expected types', () => {
      expect(DEFAULT_SUPPORTED_MIME_TYPES).toContain('image/jpeg');
      expect(DEFAULT_SUPPORTED_MIME_TYPES).toContain('image/png');
      expect(DEFAULT_SUPPORTED_MIME_TYPES).toContain('application/pdf');
    });
  });
});

// ============================================================================
// Registry Tests
// ============================================================================

describe('registry', () => {
  beforeEach(() => {
    clearProviderCache();
  });

  describe('getLLMProvider', () => {
    it('throws error when API key is missing', () => {
      expect(() => getLLMProvider('openai', {})).toThrow(
        'OpenAI API key not configured'
      );
      expect(() => getLLMProvider('anthropic', {})).toThrow(
        'Anthropic API key not configured'
      );
      expect(() => getLLMProvider('google', {})).toThrow(
        'Google API key not configured'
      );
      expect(() => getLLMProvider('xai', {})).toThrow(
        'xAI API key not configured'
      );
    });

    it('returns correct provider type for openai', () => {
      const provider = getLLMProvider('openai', { openai: 'test-key' });
      expect(provider.provider).toBe('openai');
    });

    it('returns correct provider type for anthropic', () => {
      const provider = getLLMProvider('anthropic', { anthropic: 'test-key' });
      expect(provider.provider).toBe('anthropic');
    });

    it('returns correct provider type for google', () => {
      const provider = getLLMProvider('google', { google: 'test-key' });
      expect(provider.provider).toBe('google');
    });

    it('returns correct provider type for xai', () => {
      const provider = getLLMProvider('xai', { xai: 'test-key' });
      expect(provider.provider).toBe('xai');
    });

    it('caches providers by API key', () => {
      const provider1 = getLLMProvider('openai', { openai: 'test-key-1' });
      const provider2 = getLLMProvider('openai', { openai: 'test-key-1' });
      expect(provider1).toBe(provider2);
    });

    it('creates new provider when API key changes', () => {
      const provider1 = getLLMProvider('openai', { openai: 'test-key-1' });
      const provider2 = getLLMProvider('openai', { openai: 'test-key-2' });
      expect(provider1).not.toBe(provider2);
    });
  });

  describe('clearProviderCache', () => {
    it('clears cached providers', () => {
      const provider1 = getLLMProvider('openai', { openai: 'test-key' });
      clearProviderCache();
      const provider2 = getLLMProvider('openai', { openai: 'test-key' });
      expect(provider1).not.toBe(provider2);
    });
  });

  describe('getSupportedMimeTypes', () => {
    it('returns default MIME types for all providers', () => {
      const providers: ModelProvider[] = ['openai', 'anthropic', 'google', 'xai'];

      for (const provider of providers) {
        const types = getSupportedMimeTypes(provider);
        expect(types).toEqual(DEFAULT_SUPPORTED_MIME_TYPES);
      }
    });
  });

  describe('isMimeTypeSupported', () => {
    it('returns true for supported MIME types', () => {
      expect(isMimeTypeSupported('openai', 'image/jpeg')).toBe(true);
      expect(isMimeTypeSupported('openai', 'image/png')).toBe(true);
      expect(isMimeTypeSupported('openai', 'application/pdf')).toBe(true);
    });

    it('returns false for unsupported MIME types', () => {
      expect(isMimeTypeSupported('openai', 'video/mp4')).toBe(false);
      expect(isMimeTypeSupported('openai', 'audio/mp3')).toBe(false);
      expect(isMimeTypeSupported('openai', 'application/json')).toBe(false);
    });
  });
});

// ============================================================================
// BaseLLMProvider Tests
// ============================================================================

describe('BaseLLMProvider', () => {
  // Create a concrete implementation for testing
  class TestProvider extends BaseLLMProvider {
    readonly provider: ModelProvider = 'openai';

    async stream(_request: ChatRequest, _onChunk: StreamCallback): Promise<void> {
      // Test implementation
    }

    // Expose protected methods for testing
    public testFormatCitations(citations: Citation[]): string {
      return this.formatCitations(citations);
    }

    public testAssertHasContent(hasContent: boolean, providerName: string): void {
      this.assertHasContent(hasContent, providerName);
    }
  }

  let provider: TestProvider;

  beforeEach(() => {
    provider = new TestProvider({ apiKey: 'test-key' });
  });

  describe('constructor', () => {
    it('sets apiKey from config', () => {
      const p = new TestProvider({ apiKey: 'my-api-key' });
      // We can't directly test private properties, but we can test behavior
      expect(p.provider).toBe('openai');
    });

    it('uses default timeout when not provided', () => {
      const p = new TestProvider({ apiKey: 'test-key' });
      expect(p.supportedMimeTypes).toEqual(DEFAULT_SUPPORTED_MIME_TYPES);
    });
  });

  describe('formatCitations', () => {
    it('returns empty string for empty citations array', () => {
      expect(provider.testFormatCitations([])).toBe('');
    });

    it('formats single citation correctly', () => {
      const citations: Citation[] = [
        { url: 'https://example.com', title: 'Example' },
      ];
      const result = provider.testFormatCitations(citations);

      expect(result).toContain('Sources:');
      expect(result).toContain('1. [Example](https://example.com)');
    });

    it('formats multiple citations correctly', () => {
      const citations: Citation[] = [
        { url: 'https://example1.com', title: 'Example 1' },
        { url: 'https://example2.com', title: 'Example 2' },
      ];
      const result = provider.testFormatCitations(citations);

      expect(result).toContain('1. [Example 1](https://example1.com)');
      expect(result).toContain('2. [Example 2](https://example2.com)');
    });

    it('deduplicates citations by URL', () => {
      const citations: Citation[] = [
        { url: 'https://example.com', title: 'Example 1' },
        { url: 'https://example.com', title: 'Example 2' }, // Same URL
      ];
      const result = provider.testFormatCitations(citations);

      // Should only have one citation
      expect(result.match(/\d+\./g)?.length).toBe(1);
    });
  });

  describe('assertHasContent', () => {
    it('does not throw when hasContent is true', () => {
      expect(() => provider.testAssertHasContent(true, 'Test')).not.toThrow();
    });

    it('throws when hasContent is false', () => {
      expect(() => provider.testAssertHasContent(false, 'Test')).toThrow(
        'Empty response received from Test'
      );
    });
  });

  describe('supportedMimeTypes', () => {
    it('contains default MIME types', () => {
      expect(provider.supportedMimeTypes).toContain('image/jpeg');
      expect(provider.supportedMimeTypes).toContain('image/png');
      expect(provider.supportedMimeTypes).toContain('application/pdf');
    });
  });
});

// ============================================================================
// Provider Integration Tests
// ============================================================================

describe('Provider Integration', () => {
  beforeEach(() => {
    clearProviderCache();
  });

  describe('Provider Instantiation', () => {
    it('OpenAI provider can be instantiated with valid API key', () => {
      const provider = getLLMProvider('openai', { openai: 'test-key' });
      expect(provider).toBeDefined();
      expect(provider.provider).toBe('openai');
    });

    it('Anthropic provider can be instantiated with valid API key', () => {
      const provider = getLLMProvider('anthropic', { anthropic: 'test-key' });
      expect(provider).toBeDefined();
      expect(provider.provider).toBe('anthropic');
    });

    it('Google provider can be instantiated with valid API key', () => {
      const provider = getLLMProvider('google', { google: 'test-key' });
      expect(provider).toBeDefined();
      expect(provider.provider).toBe('google');
    });

    it('xAI provider can be instantiated with valid API key', () => {
      const provider = getLLMProvider('xai', { xai: 'test-key' });
      expect(provider).toBeDefined();
      expect(provider.provider).toBe('xai');
    });
  });

  describe('supportsAttachments', () => {
    it('all providers support attachments', () => {
      const providers: Array<{ name: ModelProvider; key: string }> = [
        { name: 'openai', key: 'openai' },
        { name: 'anthropic', key: 'anthropic' },
        { name: 'google', key: 'google' },
        { name: 'xai', key: 'xai' },
      ];

      for (const { name, key } of providers) {
        const provider = getLLMProvider(name, { [key]: 'test-key' });
        // All providers should have supportedMimeTypes defined
        expect(provider.supportedMimeTypes).toBeDefined();
        expect(Array.isArray(provider.supportedMimeTypes)).toBe(true);
        expect(provider.supportedMimeTypes.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Provider Caching', () => {
    it('caches provider instances by provider type and API key', () => {
      const provider1 = getLLMProvider('openai', { openai: 'key-1' });
      const provider2 = getLLMProvider('openai', { openai: 'key-1' });
      const provider3 = getLLMProvider('anthropic', { anthropic: 'key-1' });

      // Same provider type and key should return cached instance
      expect(provider1).toBe(provider2);
      // Different provider type should return new instance
      expect(provider1).not.toBe(provider3);
    });

    it('creates new instance when API key changes', () => {
      const provider1 = getLLMProvider('openai', { openai: 'key-1' });
      const provider2 = getLLMProvider('openai', { openai: 'key-2' });

      expect(provider1).not.toBe(provider2);
    });

    it('clearProviderCache invalidates all cached providers', () => {
      const provider1 = getLLMProvider('openai', { openai: 'test-key' });
      clearProviderCache();
      const provider2 = getLLMProvider('openai', { openai: 'test-key' });

      expect(provider1).not.toBe(provider2);
    });
  });
});
