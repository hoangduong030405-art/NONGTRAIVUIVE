import type { IeltsTipCard } from './types';

/**
 * Exclusive IELTS Tip Cards that can ONLY drop from a Lexi Chest
 * (awarded for a perfect first-attempt Tier 3 answer).
 */
export const LEXI_CHEST_TIPS: readonly IeltsTipCard[] = [
  {
    id: 'chest_nominalisation',
    sourceVocabId: 'lexi_chest',
    title: 'Nominalisation for Academic Tone',
    skill: 'Writing Task 2',
    bandTarget: 'Band 7.5+',
    upgradeFrom: 'Cities are growing quickly, so housing is expensive.',
    upgradeTo: 'Rapid urban expansion has driven up housing costs.',
    tip: 'Turn verbs into nouns (grow → expansion, decide → decision) so you can pack more ideas into each clause.',
  },
  {
    id: 'chest_hedging',
    sourceVocabId: 'lexi_chest',
    title: 'Hedging Strong Claims',
    skill: 'Writing Task 2',
    bandTarget: 'Band 7.0+',
    upgradeFrom: 'Technology makes people lonely.',
    upgradeTo: 'Excessive screen time may arguably contribute to social isolation.',
    tip: 'Examiners reward measured claims. Use may, tend to, arguably, to some extent to avoid over-generalising.',
  },
  {
    id: 'chest_speaking_fillers',
    sourceVocabId: 'lexi_chest',
    title: 'Natural Thinking Time in Speaking',
    skill: 'Speaking Part 3',
    bandTarget: 'Band 7.0+',
    upgradeFrom: 'Umm… errr… I don’t know…',
    upgradeTo: 'That’s an interesting question — I’d say it largely depends on…',
    tip: 'Buy thinking time with fluent discourse phrases rather than silent pauses; this protects your Fluency & Coherence score.',
  },
  {
    id: 'chest_task1_overview',
    sourceVocabId: 'lexi_chest',
    title: 'The Task 1 Overview Rule',
    skill: 'Writing & Speaking',
    bandTarget: 'Band 7.0+',
    upgradeFrom: 'Listing every number in the chart.',
    upgradeTo: 'Overall, X rose markedly while Y remained broadly stable.',
    tip: 'Without a clear overview of main trends, Task Achievement is capped at Band 5. Write it right after your paraphrased intro.',
  },
  {
    id: 'chest_cohesion',
    sourceVocabId: 'lexi_chest',
    title: 'Invisible Cohesion',
    skill: 'Writing Task 2',
    bandTarget: 'Band 8.0+',
    upgradeFrom: 'Firstly… Secondly… Furthermore… Moreover…',
    upgradeTo: 'This shift… Such measures… The latter approach…',
    tip: 'Over-using linking words is a Band 6 marker. Band 8 essays connect ideas through reference words and logical flow.',
  },
  {
    id: 'chest_complex_grammar',
    sourceVocabId: 'lexi_chest',
    title: 'Conditionals for Range',
    skill: 'Writing & Speaking',
    bandTarget: 'Band 7.5+',
    upgradeFrom: 'If governments invest, pollution goes down.',
    upgradeTo: 'Were governments to invest in rail, emissions would fall considerably.',
    tip: 'Inverted and mixed conditionals show grammatical range — use one or two accurately rather than forcing them everywhere.',
  },
];
