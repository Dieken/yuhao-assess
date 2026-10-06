/**
 * 速度當量分析
 * 計算 5 種字頻下全碼、一級簡碼、二級簡碼、全部簡碼的速度當量
 *
 * ⚠️ 選重鍵表要一路傳到底：`從碼表計算加權速度當量` 不傳就按默認的
 * `{2: ';', 3: "'"}` 折算，而冰雪清韻配的是數字鍵 `{2: '2', 3: '3'}`，
 * 兩者的擊鍵當量不同。漏傳只在「選重鍵不是默認那一組」的方案上看得出來，
 * 其餘方案一模一樣——2026-10-06 全表對賬時就只有清韻一個對不上（差 0.005）。
 */

import {
  從碼表計算加權速度當量,
  生成一級簡碼加選重鍵表,
  生成二級簡碼加選重鍵表,
} from '../../services/speedEquivalentService'
import type { 碼表型别, 頻率數據型别 } from '../../types'
import type { 速度當量分析結果介面 } from '../../atoms/speedEquivalent'
import type { 選重鍵表型别 } from '../../types/scheme'

const FREQ_TYPES = [
  '知乎簡體字頻',
  '北語簡體字頻',
  '臺標繁體字頻',
  '古籍繁體字頻',
  '繁簡聯合字頻',
] as const

type FreqType = (typeof FREQ_TYPES)[number]

const PREFIX_MAP: Record<FreqType, string> = {
  知乎簡體字頻: '知乎簡體字頻',
  北語簡體字頻: '北語簡體字頻',
  臺標繁體字頻: '臺標繁體字頻',
  古籍繁體字頻: '古籍繁體字頻',
  繁簡聯合字頻: '繁簡聯合字頻',
}

export async function analyzeSpeedEquivalent(
  fullCodeWithSelectionTable: 碼表型别,
  shortCodeWithSelectionTable: 碼表型别,
  charFrequencies: Record<string, 頻率數據型别>,
  equivTable: Record<string, number>,
  選重鍵表?: 選重鍵表型别
): Promise<速度當量分析結果介面> {
  // 生成一級和二級簡碼表（不傳上屏鍵，使用默認空格鍵）
  const firstShortTable = 生成一級簡碼加選重鍵表(
    shortCodeWithSelectionTable,
    fullCodeWithSelectionTable,
    []
  )
  const secondShortTable = 生成二級簡碼加選重鍵表(
    shortCodeWithSelectionTable,
    fullCodeWithSelectionTable,
    []
  )

  const result: Partial<速度當量分析結果介面> = {}

  for (const freqType of FREQ_TYPES) {
    const freq = charFrequencies[freqType] || {}
    const prefix = PREFIX_MAP[freqType]

    ;(result as Record<string, number>)[prefix + '全碼速度當量'] = 從碼表計算加權速度當量(
      fullCodeWithSelectionTable,
      freq,
      equivTable,
      選重鍵表
    )
    ;(result as Record<string, number>)[prefix + '一級簡碼速度當量'] = 從碼表計算加權速度當量(
      firstShortTable,
      freq,
      equivTable,
      選重鍵表
    )
    ;(result as Record<string, number>)[prefix + '二級簡碼速度當量'] = 從碼表計算加權速度當量(
      secondShortTable,
      freq,
      equivTable,
      選重鍵表
    )
    ;(result as Record<string, number>)[prefix + '全部簡碼速度當量'] = 從碼表計算加權速度當量(
      shortCodeWithSelectionTable,
      freq,
      equivTable,
      選重鍵表
    )
  }

  result.更新時間 = new Date().toISOString()
  return result as 速度當量分析結果介面
}
