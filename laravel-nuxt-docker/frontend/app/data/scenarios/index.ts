import type {
  Scenario,
} from '~/types/games/detective'

import {
  case001,
} from './cases/case001'

import case002 from './cases/case002'

import {
  case003,
} from './cases/case003'

const scenarios: Scenario[] = [
  case001,
  case002,
  case003
]

export function getScenario(
  id: string,
): Scenario | undefined {
  return scenarios.find(
    scenario =>
      scenario.id === id,
  )
}