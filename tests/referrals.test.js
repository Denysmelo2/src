// One place for referral links and codes (handover "testes reais",
// 24/11/2026, task 2): the database first, src/lib/affiliateLinks.js only
// as the fallback.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getReferral, getAffiliateLink, referralLine, setPlatformReferrals, referralsVersion } from '../src/lib/affiliateLinks.js';

test('before the database is read: the file, no codes', () => {
  setPlatformReferrals([]);
  assert.equal(getAffiliateLink('quidco'), 'https://quidco.com/raf/14425585/');
  assert.deepEqual(getReferral('quidco'), { url: 'https://quidco.com/raf/14425585/', code: null, reward: null, note: null });
  // Removed from the file (they disagreed with the database / were broken).
  assert.equal(getAffiliateLink('everup'), '');
  assert.equal(getAffiliateLink('rakuten'), '');
  assert.equal(getAffiliateLink('jamdoughnut'), '');
});

test('the database wins, with its code, reward and note', () => {
  const v = referralsVersion();
  setPlatformReferrals([
    { code: 'everup', slug: 'everup', name: 'EverUp', affiliate_url: 'https://everup.onelink.me/9lgD/vg866wd3' },
    { code: 'airtime-rewards', slug: 'airtime-rewards', name: 'Airtime Rewards', affiliate_url: 'https://airtimerewards.app.link/XlgKV6ABNWb' },
    { code: 'nx-rewards', slug: 'nx-rewards', name: 'NX Rewards', affiliate_url: 'https://www.nxrewards.com/', referral_code: 'REFXYH9R', referral_reward: 'a bonus on your first purchase', referral_note: 'Type it when you create your account.' },
    { code: 'curve-rewards', slug: 'curve-rewards', name: 'Curve Rewards', affiliate_url: null, referral_code: 'NVOGMMLD', referral_reward: null },
    { code: 'quidco', slug: 'quidco', name: 'Quidco', affiliate_url: 'https://quidco.com/raf/14425585/', referral_code: '  ' },
  ]);
  assert.ok(referralsVersion() > v);
  assert.equal(getAffiliateLink('everup'), 'https://everup.onelink.me/9lgD/vg866wd3');
  // The offer rows say 'airtime'; the platform row is 'airtime-rewards'.
  assert.equal(getAffiliateLink('airtime'), 'https://airtimerewards.app.link/XlgKV6ABNWb');
  const nx = getReferral('NX Rewards');
  assert.deepEqual(nx, { url: 'https://www.nxrewards.com/', code: 'REFXYH9R', reward: 'a bonus on your first purchase', note: 'Type it when you create your account.' });
  assert.deepEqual(getReferral('nx_rewards').code, 'REFXYH9R');
  // Curve: the code from the database, the link still from the file.
  assert.deepEqual(getReferral('curve'), { url: 'https://www.curve.com/join#NVOGMMLD', code: 'NVOGMMLD', reward: null, note: null });
  // A blank code is no code.
  assert.equal(getReferral('quidco').code, null);
  setPlatformReferrals([]);
});

test('the line under an "Open" button', () => {
  assert.equal(referralLine({ code: 'DENYD11D', reward: '£25 after your first rent payment' }), 'Use code DENYD11D when you sign up — you get £25 after your first rent payment');
  assert.equal(referralLine({ code: 'UFDN', reward: null }), 'Use code UFDN when you sign up');
  assert.equal(referralLine({ code: null }), null);
});
