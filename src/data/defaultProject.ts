/**
 * Default demo project for StoryForge
 * Loaded on first visit when no project exists in localStorage
 */

import type { Project } from '../types';

export const DEFAULT_PROJECT: Project = {
  storyforge: '1.0',
  schema_version: 1,
  project: {
    title: 'The Whisperwood Tales',
    author: 'Demo Author',
  },
  settings: {
    llm_provider: '',
    default_reference_mode: 'summary',
  },
  blocks: {
    prompts: {
      character: {
        output: {
          input: '',
          selected: 'v1',
          output: {
            v1: `Create a character with: name, appearance (2-3 lines), personality (2-3 traits), background (1-2 sentences).`,
          },
        },
      },
      scene: {
        output: {
          input: '',
          selected: 'v1',
          output: {
            v1: `Write a scene with the given characters and location. Include dialogue, action, and atmosphere. ~300 words.`,
          },
        },
      },
    },
    character: {
      alice: {
        raw: {
          input: `[prompts:character]

A ranger who tracks criminals in the Whisperwood forest.`,
          selected: 'v1',
          output: {
            v1: `**Alice Thornwood**, 28, former Royal Ranger.

Tall and lean with dark hair in a practical braid, grey-green eyes that miss nothing, thin scar along left jaw.

Patient, methodical, struggles with trust. Dry humor in tense moments.

Now a bounty hunter after the Rangers disbanded. Haunted by her mother's connection to the dragon cults.`,
          },
        },
        summary: {
          input: `Summarize in one sentence:\n[alice:raw]`,
          selected: '',
          output: {},
        },
      },
      marcus: {
        raw: {
          input: `[prompts:character]

A traveling merchant with secrets and a silver tongue.`,
          selected: 'v1',
          output: {
            v1: `**Marcus Webb**, 35, traveling merchant.

Average height, forgettable face (intentionally), warm brown eyes, always impeccably dressed despite dusty roads.

Charming, quick-witted, loyal to those who earn it. Hides depth behind easy smiles.

Runs legitimate trade routes but also moves information. Owes Alice a life-debt from five years ago.`,
          },
        },
      },
    },
    location: {
      whisperwood: {
        raw: {
          input: `Describe an ancient magical forest.`,
          selected: 'v1',
          output: {
            v1: `**The Whisperwood** - an ancient forest where memories linger. Trees silver-barked and tall, mist that carries echoes of past conversations. Said to remember all who enter. Dangerous at night when the old spirits wake.`,
          },
        },
      },
    },
    scene: {
      meeting: {
        raw: {
          input: `[prompts:scene]

Characters: [character:alice], [character:marcus]
Location: [location:whisperwood]
Situation: Alice catches Marcus on the road, suspecting he's involved in smuggling.`,
          selected: '',
          output: {},
        },
      },
    },
  },
  tree: {
    expanded_categories: ['prompts', 'character', 'location', 'scene'],
    selected: 'character:alice',
  },
};
