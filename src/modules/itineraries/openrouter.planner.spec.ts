import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { OpenRouterPlanner } from './openrouter.planner';
import { PlannerRequest } from './itinerary-planner.port';

jest.mock('axios');
const mockedAxios = jest.mocked(axios);

const REQUEST: PlannerRequest = {
  destination: 'Cape Coast',
  days: 1,
  partySize: 2,
  interests: ['history'],
  candidateTours: [
    {
      id: 'tour-1',
      slug: 'kakum-canopy-walk',
      title: 'Kakum Canopy Walk',
      destinationName: 'Cape Coast',
      priceMinor: 12000,
      durationMinutes: 180,
    },
  ],
};

function aiConfig(apiKey: string) {
  return {
    get: () => ({
      apiKey,
      model: 'test-model',
      baseUrl: 'https://openrouter.test/api/v1',
      timeoutMs: 20000,
    }),
  } as unknown as ConfigService;
}

function completion(content: string) {
  return { data: { choices: [{ message: { content } }] } };
}

const VALID_CONTENT = JSON.stringify({
  title: 'Cape Coast in a day',
  summary: 'A packed day',
  days: [
    {
      day: 1,
      title: 'Day 1',
      items: [
        {
          period: 'morning',
          kind: 'TOUR',
          title: 'Canopy walk',
          description: 'Walk it',
          tourId: 'tour-1',
        },
      ],
    },
  ],
});

describe('OpenRouterPlanner', () => {
  let post: jest.Mock;

  beforeEach(() => {
    post = jest.fn();
    mockedAxios.create.mockReturnValue({ post } as unknown as AxiosInstance);
  });

  it('throws 503 when the API key is not configured', async () => {
    const planner = new OpenRouterPlanner(aiConfig(''));
    await expect(planner.plan(REQUEST)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('sends the model, JSON response_format and candidate tours', async () => {
    post.mockResolvedValue(completion(VALID_CONTENT));
    const planner = new OpenRouterPlanner(aiConfig('sk-or-test'));
    await planner.plan(REQUEST);

    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/chat/completions');
    expect(body.model).toBe('test-model');
    expect(body.response_format).toEqual({ type: 'json_object' });
    const userMessage = body.messages[1].content;
    expect(userMessage).toContain('tour-1');
    expect(userMessage).toContain('Kakum Canopy Walk');
  });

  it('parses a well-formed completion into a PlannerResult', async () => {
    post.mockResolvedValue(completion(VALID_CONTENT));
    const planner = new OpenRouterPlanner(aiConfig('sk-or-test'));
    const result = await planner.plan(REQUEST);
    expect(result.title).toBe('Cape Coast in a day');
    expect(result.model).toBe('test-model');
    expect(result.plan.days[0].items[0].tourId).toBe('tour-1');
  });

  it('retries once then throws 502 on persistently malformed JSON', async () => {
    post.mockResolvedValue(completion('not json at all'));
    const planner = new OpenRouterPlanner(aiConfig('sk-or-test'));
    await expect(planner.plan(REQUEST)).rejects.toThrow(BadGatewayException);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('recovers on the second attempt after a transient failure', async () => {
    post
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValueOnce(completion(VALID_CONTENT));
    const planner = new OpenRouterPlanner(aiConfig('sk-or-test'));
    const result = await planner.plan(REQUEST);
    expect(result.title).toBe('Cape Coast in a day');
    expect(post).toHaveBeenCalledTimes(2);
  });
});
