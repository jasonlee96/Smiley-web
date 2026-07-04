export interface EC2Instance {
  instanceId: string
  state: 'running' | 'stopped' | 'pending' | 'stopping'
  instanceType: string
  publicIp?: string
  privateIp?: string
  launchTime?: string
  availabilityZone?: string
}

export interface EC2Utilization {
  cpu_percent: string
  mem_percent: string
  disk_percent: string
  reported_at: string
}

export interface Schedule {
  name: string
  groupName: string
  state: 'ENABLED' | 'DISABLED'
  scheduleExpression: string
  target: string
  lastModified: string
}
