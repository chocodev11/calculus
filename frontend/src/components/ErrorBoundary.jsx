import React from 'react'

export default class ErrorBoundary extends React.Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Render error captured by ErrorBoundary', error, info)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    if (typeof this.props.fallback === 'function') {
      return this.props.fallback({ error: this.state.error, reset: this.reset })
    }
    return (
      <div className="min-h-[160px] flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
        <div className="text-center">
          <p className="font-bold">Giao diện gặp lỗi khi hiển thị nội dung.</p>
          <button type="button" onClick={this.reset} className="mt-2 font-bold underline underline-offset-2">
            Thử lại
          </button>
        </div>
      </div>
    )
  }
}
