import { useOutlet } from 'react-router-dom'

export default function AnimatedOutlet() {
  const element = useOutlet()

  return <div>{element}</div>
}
