import { describe, it, expect } from 'vitest';
import {
  dialogueService,
  NPC_ACCEPT_QUOTES,
  NPC_REJECT_QUOTES,
  GENERAL_DIALOGUES,
} from '../src/server/services/dialogueService';

describe('DialogueEngine & Vietnamese Quotes', () => {
  it('contains at least 40 diverse Vietnamese lines across categories', () => {
    const totalLines =
      NPC_ACCEPT_QUOTES.length +
      NPC_REJECT_QUOTES.length +
      GENERAL_DIALOGUES.market_status.length +
      GENERAL_DIALOGUES.tea_order.length +
      GENERAL_DIALOGUES.stories.length +
      GENERAL_DIALOGUES.sitting_chill.length +
      GENERAL_DIALOGUES.role_greetings.length;

    expect(totalLines).toBeGreaterThanOrEqual(40);
  });

  it('personalizes greetings based on player role and name', () => {
    const greeting = dialogueService.getGreeting('Minh Trí', 'Cao Thủ Đu Đỉnh');
    expect(greeting).toContain('Minh Trí');
    expect(greeting).toContain('Cao Thủ Đu Đỉnh');
  });

  it('provides varied market and story commentary without returning null or empty string', () => {
    const market = dialogueService.getMarketComment();
    expect(market.length).toBeGreaterThan(10);

    const story = dialogueService.getTraderStory();
    expect(story.length).toBeGreaterThan(10);

    const tea = dialogueService.getTeaOrderResponse();
    expect(tea.length).toBeGreaterThan(10);

    const chill = dialogueService.getChillComment();
    expect(chill.length).toBeGreaterThan(10);
  });

  it('provides humorous accept and reject quotes for the 80/20 mechanic', () => {
    const acceptQuote = dialogueService.getSignalAcceptQuote();
    expect(acceptQuote.length).toBeGreaterThan(5);

    const rejectQuote = dialogueService.getSignalRejectQuote();
    expect(rejectQuote.length).toBeGreaterThan(5);
  });
});
