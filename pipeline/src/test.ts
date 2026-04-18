import './config/loadEnv'
import { runPlanner } from './agents/planner'

async function main() {
  console.log('Testing Planner agent...')
  
  const result = await runPlanner('What is Nvidia s competitive position in AI chips?')
  
  console.log('Result:', JSON.stringify(result, null, 2))
}

main().catch(console.error)