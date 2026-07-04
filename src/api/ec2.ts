import client from './client'
import type { EC2Instance, EC2Utilization, Schedule } from '../types/ec2'

export const ec2Api = {
  getInstance: () => client.get<EC2Instance>('/aws/ec2').then(r => r.data),
  start: () => client.post('/aws/ec2/start').then(r => r.data),
  stop: () => client.post('/aws/ec2/stop').then(r => r.data),
  getUtilization: () => client.get<EC2Utilization>('/aws/ec2/utilization').then(r => r.data),
  getSchedules: () => client.get<Schedule[]>('/aws/schedules').then(r => r.data),
  toggleSchedule: (group: string, name: string, state: 'ENABLED' | 'DISABLED') =>
    client.patch(`/aws/schedules/${group}/${name}/toggle`, { state }).then(r => r.data),
}
