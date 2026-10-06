import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Space, Upload, App, Select, Popconfirm, Tooltip } from 'antd'
import {
  DownloadOutlined,
  UploadOutlined,
  PlusOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import { useAtom, useSetAtom, useAtomValue } from 'jotai'
import styled from 'styled-components'
import { 當前方案原子狀態, 方案列表原子狀態 } from '@/atoms/scheme'
import { 動態選重分析原子狀態 } from '@/atoms/dynamicDuplicate'
import { 靜態重碼分析原子狀態 } from '@/atoms/staticDuplicate'
import { 候選個數分析原子狀態 } from '@/atoms/maximumCandidates'
import { 速度當量分析原子狀態, 當量詳情原子狀態 } from '@/atoms/speedEquivalent'
import { 連續文本當量分析原子狀態 } from '@/atoms/continuousEquivalent'
import { 簡碼效率分析原子狀態 } from '@/atoms/shortCodeEfficiency'
import { 鍵位熱力分析原子狀態 } from '@/atoms/keyboardHeatmap'
import { 碼表原子狀態, 原始碼表原子狀態, 編碼預覽數據原子狀態 } from '@/atoms/codeTable'
import {
  本地方案列表原子狀態,
  當前本地方案標識符原子狀態,
  生成本地標識符,
  生成克隆後綴,
} from '@/atoms/localSchemes'
import { 創建空白方案, 加載方案, 列出可用方案, 查找方案鍵名 } from '@/services/schemeService'
import { 清空所有Atom, 應用方案數據, type 方案應用Setters } from '@/services/atomResetService'
import { 導出方案配置JSON } from '@/services/exportService'
import { 觸發所有分析計算 } from '@/services/triggerAnalysisService'
import type { 方案列表項介面, 方案配置介面 } from '@/types/scheme'
import type { RcFile } from 'antd/es/upload'

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`

const PageTitle = styled.h1`
  margin: 0;
  color: white;
  font-size: 18px;
  font-weight: 500;
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
`

export function AppHeader() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [當前方案, 設置當前方案] = useAtom(當前方案原子狀態)
  const [方案列表, 設置方案列表] = useAtom(方案列表原子狀態)
  const [方案切換中, 設置方案切換中] = useState(false)
  const 設置靜態重碼分析結果 = useSetAtom(靜態重碼分析原子狀態)
  const 設置動態選重分析結果 = useSetAtom(動態選重分析原子狀態)
  const 設置候選個數分析結果 = useSetAtom(候選個數分析原子狀態)
  const 設置速度當量分析結果 = useSetAtom(速度當量分析原子狀態)
  const 設置簡碼效率分析結果 = useSetAtom(簡碼效率分析原子狀態)
  const 設置鍵位熱力分析結果 = useSetAtom(鍵位熱力分析原子狀態)
  const 設置碼表數據 = useSetAtom(碼表原子狀態)
  const 設置原始碼表 = useSetAtom(原始碼表原子狀態)
  const 設置編碼預覽數據 = useSetAtom(編碼預覽數據原子狀態)

  // 讀取分析結果用於導出和克隆快照
  const 靜態重碼分析結果 = useAtomValue(靜態重碼分析原子狀態)
  const 動態選重分析結果 = useAtomValue(動態選重分析原子狀態)
  const 候選個數分析結果 = useAtomValue(候選個數分析原子狀態)
  const 速度當量分析結果 = useAtomValue(速度當量分析原子狀態)
  const 設置當量詳情 = useSetAtom(當量詳情原子狀態)
  const [連續文本當量分析結果, 設置連續文本當量分析結果] = useAtom(連續文本當量分析原子狀態)
  const 簡碼效率分析結果 = useAtomValue(簡碼效率分析原子狀態)
  const 鍵位熱力分析結果 = useAtomValue(鍵位熱力分析原子狀態)
  const 編碼預覽數據 = useAtomValue(編碼預覽數據原子狀態)

  // 本地方案
  const [本地方案列表, 設置本地方案列表] = useAtom(本地方案列表原子狀態)
  const [當前本地方案標識符, 設置當前本地方案標識符] = useAtom(當前本地方案標識符原子狀態)

  const 顯示標題 = 當前方案 ? 當前方案.元數據.方案名 : '未選擇方案'
  const 可以全局重算 = 編碼預覽數據.length > 0

  // 所有寫入方案狀態的 setter，供 atomResetService 統一調度
  const 方案Setters: 方案應用Setters = {
    設置當前方案,
    設置碼表數據,
    設置原始碼表,
    設置編碼預覽數據,
    設置靜態重碼分析結果,
    設置動態選重分析結果,
    設置候選個數分析結果,
    設置速度當量分析結果,
    設置當量詳情,
    設置連續文本當量分析結果,
    設置簡碼效率分析結果,
    設置鍵位熱力分析結果,
  }

  // 清空所有原子狀態（統一函數）
  const 清空所有原子狀態 = () => 清空所有Atom(方案Setters)

  /**
   * 加載預設方案列表
   *
   * 頂欄在每個路由下都掛着，由它負責拉列表，
   * 用户就算不經過首頁也能直接在頂欄切換方案。
   */
  useEffect(() => {
    let 已卸載 = false
    async function 初始化方案列表() {
      try {
        const 方案鍵名列表 = await 列出可用方案()
        const 加載的方案列表 = await Promise.all(
          方案鍵名列表.map(鍵名 =>
            加載方案(鍵名)
              .then(配置 => ({ 鍵名, 配置 }))
              .catch(錯誤 => {
                console.error(`❌ [AppHeader] 方案 ${鍵名} 加載失敗:`, 錯誤)
                return null
              })
          )
        )
        if (已卸載) return
        設置方案列表(加載的方案列表.filter((項): 項 is 方案列表項介面 => 項 !== null))
      } catch (錯誤) {
        console.error('❌ [AppHeader] 加載方案列表失敗:', 錯誤)
      }
    }
    初始化方案列表()
    return () => {
      已卸載 = true
    }
  }, [設置方案列表])

  // 切換預設方案（與首頁的下拉選單同一套邏輯）
  const 處理選擇方案 = async (方案鍵名: string) => {
    設置方案切換中(true)
    try {
      const 加載的數據 = await 加載方案(方案鍵名)
      const { 方案, 已載入結果 } = 應用方案數據(加載的數據, 方案Setters)
      const 完整提示 = 已載入結果.length > 0 ? `（包含${已載入結果.join('、')}結果）` : ''
      message.success(`已加載方案「${方案.元數據.方案名}」${完整提示}`)
    } catch (錯誤) {
      console.error('[AppHeader] 加載方案失敗:', 錯誤)
      message.error(錯誤 instanceof Error ? 錯誤.message : '加載方案失敗')
    } finally {
      設置方案切換中(false)
    }
  }

  // 導入配置
  const 處理導入JSON = (file: RcFile): boolean => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const 導入數據 = JSON.parse(e.target?.result as string)
        console.log('[AppHeader] 從文件導入的原始數據:', 導入數據)

        設置當前本地方案標識符(null)
        const { 方案, 已載入結果 } = 應用方案數據(導入數據, 方案Setters)
        const 完整提示 = 已載入結果.length > 0 ? `（包含${已載入結果.join('、')}結果）` : ''
        message.success(`已導入配置「${方案.元數據.方案名}」${完整提示}`)
      } catch (錯誤) {
        console.error('[AppHeader] 導入配置失敗:', 錯誤)
        message.error('導入配置失敗：文件格式不正確')
      }
    }
    reader.readAsText(file)
    return false
  }

  // 導出配置
  const 處理導出JSON = () => {
    if (!當前方案) {
      message.warning('請先選擇或創建方案')
      return
    }
    const 結果 = 導出方案配置JSON(
      當前方案,
      {
        靜態重碼分析結果,
        動態選重分析結果,
        候選個數分析結果,
        速度當量分析結果,
        簡碼效率分析結果,
        鍵位熱力分析結果,
        連續文本當量分析結果,
      },
      false
    )
    if (結果.success) {
      message.success(結果.message || '導出成功')
    } else {
      message.error(結果.message || '導出失敗')
    }
  }

  // 創建新方案
  const 處理創建新方案 = () => {
    清空所有原子狀態()
    const 新方案 = 創建空白方案()
    設置當前方案(新方案)
    設置本地方案列表(prev => [...prev, 新方案])
    設置當前本地方案標識符(新方案.元數據.標識符)
    message.success('已創建新方案')
  }

  // 克隆：原方案存入 local schemes，當前方案改爲克隆名+新標識符
  const 處理克隆方案 = () => {
    if (!當前方案) {
      message.warning('請先選擇或創建方案')
      return
    }
    const 現在 = new Date().toISOString()
    // 1. 原方案快照（含當前測評結果）存入 local schemes
    const 原方案快照: 方案配置介面 = {
      ...當前方案,
      測評結果: {
        動態選重分析: 動態選重分析結果 ?? undefined,
        靜態重碼分析: 靜態重碼分析結果 ?? undefined,
        候選個數分析: 候選個數分析結果 ?? undefined,
        速度當量分析: 速度當量分析結果 ?? undefined,
        簡碼效率分析: 簡碼效率分析結果 ?? undefined,
        鍵位熱力: 鍵位熱力分析結果 ?? undefined,
      },
    }
    const 原標識符 = 當前方案.元數據.標識符
    設置本地方案列表(prev => {
      const 已存在 = prev.some(s => s.元數據.標識符 === 原標識符)
      return 已存在
        ? prev.map(s => (s.元數據.標識符 === 原標識符 ? 原方案快照 : s))
        : [...prev, 原方案快照]
    })
    // 2. 當前方案改爲克隆名+新標識符，同時加入本地方案列表
    const 新標識符 = 生成本地標識符()
    const 新方案名 = 當前方案.元數據.方案名 + 生成克隆後綴()
    const 克隆方案: 方案配置介面 = {
      ...當前方案,
      元數據: {
        ...當前方案.元數據,
        方案名: 新方案名,
        標識符: 新標識符,
        創建時間: 現在,
        更新時間: 現在,
      },
    }
    設置本地方案列表(prev => [...prev.filter(s => s.元數據.標識符 !== 新標識符), 克隆方案])
    設置當前方案(克隆方案)
    設置當前本地方案標識符(新標識符)
    navigate('/')
    message.success(`已克隆，當前方案已更名爲「${新方案名}」`)
  }

  // 切換本地方案
  const 處理切換本地方案 = (標識符: string) => {
    const 目標 = 本地方案列表.find(s => s.元數據.標識符 === 標識符)
    if (!目標) return
    應用方案數據(目標, 方案Setters)
    設置當前本地方案標識符(標識符)
    message.success(`已切換到「${目標.元數據.方案名}」`)
  }

  // 清除：本地方案則删除，否則清空所有
  const 處理清除 = () => {
    if (當前本地方案標識符) {
      const 被删名 = 當前方案?.元數據.方案名
      const 新列表 = 本地方案列表.filter(s => s.元數據.標識符 !== 當前本地方案標識符)
      設置本地方案列表(新列表)
      設置當前本地方案標識符(null)
      if (新列表.length > 0) {
        const 末尾 = 新列表[新列表.length - 1]!
        應用方案數據(末尾, 方案Setters)
        設置當前本地方案標識符(末尾.元數據.標識符)
        message.success(`已删除「${被删名}」，已切換到「${末尾.元數據.方案名}」`)
      } else {
        清空所有原子狀態()
        設置當前方案(null)
        message.success(`已删除本地方案「${被删名}」`)
      }
    } else {
      清空所有原子狀態()
      設置當前方案(null)
      message.success('已清除所有數據')
    }
  }

  // 全局重算
  const 處理全局重算 = async () => {
    設置靜態重碼分析結果(null)
    設置動態選重分析結果(null)
    設置候選個數分析結果(null)
    設置速度當量分析結果(null)
    設置簡碼效率分析結果(null)
    設置鍵位熱力分析結果(null)
    message.loading('正在清除舊數據並觸發重新計算...', 1)
    await 觸發所有分析計算(navigate, '/')
    message.success('所有分析已觸發！')
  }

  const 本地方案選項 = 本地方案列表.map(s => ({
    value: s.元數據.標識符,
    label: s.元數據.方案名,
  }))

  const 清除確認文字 = 當前本地方案標識符
    ? `確定删除本地方案「${當前方案?.元數據.方案名}」？`
    : '確定清除所有數據？'

  return (
    <HeaderContainer>
      <PageTitle title={顯示標題}>{顯示標題}</PageTitle>
      <Space wrap size="small">
        {/* 不加文字標籤：左邊的大標題已經是當前方案名，選單指向什麽一望而知 */}
        <Select
          style={{ width: 160 }}
          size="small"
          placeholder="切換預設方案"
          loading={方案切換中}
          value={查找方案鍵名(方案列表, 當前方案)}
          onChange={處理選擇方案}
          options={方案列表.map(項 => ({
            value: 項.鍵名,
            label: 項.配置.元數據.方案名,
          }))}
        />
        {本地方案列表.length > 0 && (
          <Select
            size="small"
            style={{ minWidth: 150, maxWidth: 220 }}
            placeholder="切換本地方案"
            value={當前本地方案標識符 ?? undefined}
            onChange={處理切換本地方案}
            options={本地方案選項}
            popupMatchSelectWidth={false}
          />
        )}
        <Upload beforeUpload={處理導入JSON} showUploadList={false} accept="application/json">
          <Button icon={<UploadOutlined />} size="small">
            導入
          </Button>
        </Upload>
        <Button
          icon={<DownloadOutlined />}
          onClick={處理導出JSON}
          disabled={!當前方案}
          size="small"
        >
          導出
        </Button>
        <Button icon={<PlusOutlined />} onClick={處理創建新方案} size="small">
          創建
        </Button>
        <Tooltip title="將當前方案存入本地，並以新名稱繼續編輯">
          <Button icon={<CopyOutlined />} onClick={處理克隆方案} disabled={!當前方案} size="small">
            克隆
          </Button>
        </Tooltip>
        <Button
          icon={<ThunderboltOutlined />}
          onClick={處理全局重算}
          disabled={!可以全局重算}
          size="small"
          type="primary"
        >
          重算
        </Button>
        <Popconfirm
          title={清除確認文字}
          onConfirm={處理清除}
          okText="確定"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Button icon={<DeleteOutlined />} danger size="small">
            清除
          </Button>
        </Popconfirm>
      </Space>
    </HeaderContainer>
  )
}
