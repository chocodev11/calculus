const { spawnSync } = require('node:child_process')
const { existsSync } = require('node:fs')
const path = require('node:path')
const process = require('node:process')

const bindingsByPlatformAndArch = {
  android: {
    arm: { base: 'android-arm-eabi' },
    arm64: { base: 'android-arm64' },
  },
  darwin: {
    arm64: { base: 'darwin-arm64' },
    x64: { base: 'darwin-x64' },
  },
  freebsd: {
    arm64: { base: 'freebsd-arm64' },
    x64: { base: 'freebsd-x64' },
  },
  linux: {
    arm: { base: 'linux-arm-gnueabihf', musl: 'linux-arm-musleabihf' },
    arm64: { base: 'linux-arm64-gnu', musl: 'linux-arm64-musl' },
    loong64: { base: 'linux-loong64-gnu', musl: 'linux-loong64-musl' },
    ppc64: { base: 'linux-ppc64-gnu', musl: 'linux-ppc64-musl' },
    riscv64: { base: 'linux-riscv64-gnu', musl: 'linux-riscv64-musl' },
    s390x: { base: 'linux-s390x-gnu', musl: null },
    x64: { base: 'linux-x64-gnu', musl: 'linux-x64-musl' },
  },
  openbsd: {
    x64: { base: 'openbsd-x64' },
  },
  openharmony: {
    arm64: { base: 'openharmony-arm64' },
  },
  win32: {
    arm64: { base: 'win32-arm64-msvc' },
    ia32: { base: 'win32-ia32-msvc' },
    x64: { base: isMingw32() ? 'win32-x64-gnu' : 'win32-x64-msvc' },
  },
}

function getReportHeader() {
  try {
    if (process.platform !== 'win32') {
      return process.report.getReport().header
    }

    const child = spawnSync(
      process.execPath,
      ['-p', "console.log(JSON.stringify(require('node:process').report.getReport().header));"],
      {
        encoding: 'utf8',
        timeout: 3000,
        windowsHide: true,
      }
    )

    if (child.status !== 0) return null

    const stdout = child.stdout?.replace(/undefined\r?\n?$/, '').trim()
    return stdout ? JSON.parse(stdout) : null
  } catch {
    return null
  }
}

function isMingw32() {
  return getReportHeader()?.osName?.startsWith('MINGW32_NT') ?? false
}

function isMusl() {
  const header = getReportHeader()
  return header ? !header.glibcVersionRuntime : false
}

function getPackageBase() {
  const platformBindings = bindingsByPlatformAndArch[process.platform]
  const target = platformBindings?.[process.arch]

  if (!target) {
    throw new Error(`Unsupported Rollup platform/arch: ${process.platform}/${process.arch}`)
  }

  if ('musl' in target && isMusl()) {
    if (!target.musl) {
      throw new Error(`Unsupported musl Rollup platform/arch: ${process.platform}/${process.arch}`)
    }

    return target.musl
  }

  return target.base
}

function getNativePackageName() {
  return `@rollup/rollup-${getPackageBase()}`
}

function getRollupVersion() {
  const rollupPackageJsonPath = path.join(process.cwd(), 'node_modules', 'rollup', 'package.json')

  if (!existsSync(rollupPackageJsonPath)) {
    throw new Error('rollup is not installed. Run `npm install` first.')
  }

  return require(rollupPackageJsonPath).version
}

function hasNativePackage(packageName) {
  return existsSync(path.join(process.cwd(), 'node_modules', packageName))
}

function installNativePackage(packageName, version) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const installResult = spawnSync(
    npmCommand,
    ['install', '--no-save', '--no-package-lock', `${packageName}@${version}`],
    {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: process.env,
    }
  )

  if (installResult.status !== 0) {
    process.exit(installResult.status ?? 1)
  }
}

const nativePackageName = getNativePackageName()

if (!hasNativePackage(nativePackageName)) {
  const rollupVersion = getRollupVersion()
  console.log(`[rollup-native] Installing ${nativePackageName}@${rollupVersion}`)
  installNativePackage(nativePackageName, rollupVersion)
}
