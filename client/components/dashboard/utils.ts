// UI helper functions for dashboard styling

export const getStatusColor = (status: string) => {
  switch (status) {
    case "Active":
    case "Completed":
      return "bg-green-600/20 text-green-400"
    case "Processing":
      return "bg-amber-600/20 text-amber-400"
    case "Inactive":
    case "Deprecated":
      return "bg-gray-600/20 text-gray-400"
    case "Failed":
      return "bg-red-600/20 text-red-400"
    default:
      return "bg-gray-600/20 text-gray-400"
  }
}

export const getApiStatusColor = (status: string) => {
  switch (status) {
    case "healthy":
      return "bg-green-400"
    case "degraded":
      return "bg-amber-400"
    case "offline":
      return "bg-red-400"
    default:
      return "bg-gray-400"
  }
}

export const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "High":
      return "bg-red-600/20 text-red-400"
    case "Medium":
      return "bg-amber-600/20 text-amber-400"
    case "Low":
      return "bg-green-600/20 text-green-400"
    default:
      return "bg-gray-600/20 text-gray-400"
  }
}
