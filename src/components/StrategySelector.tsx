// ============================================================
// FILE: src/components/StrategySelector.tsx (NEW FILE)
// Strategy picker UI — lets user switch trading strategies
// ============================================================

'use client';

import { useState } from 'react';
import { StrategyType, StrategyConfig } from '@/types';
import { getAllStrategies } from '@/lib/strategies';

interface StrategySelectorProps {
  activeStrategy: StrategyType;
  onSelect: (strategy: StrategyType) => void;
  disabled?: boolean;
}

export default function StrategySelector({
  activeStrategy,
  onSelect,
  disabled = false,
}: StrategySelectorProps) {
  const [expandedId, setExpandedId] = useState<StrategyType | null>(null);
  const strategies = getAllStrategies();

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        🎮 Trading Strategy
        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
          Select one
        </span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {strategies.map((strategy) => {
          const isActive = activeStrategy === strategy.id;
          const isExpanded = expandedId === strategy.id;

          return (
            <div
              key={strategy.id}
              className={`relative rounded-xl border-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-opacity-100 bg-opacity-10 ring-2 ring-opacity-50'
                  : 'border-gray-700 hover:border-gray-500 bg-gray-800/50'
              }`}
              style={{
                borderColor: isActive ? strategy.color : undefined,
                backgroundColor: isActive
                  ? `${strategy.color}15`
                  : undefined,
                boxShadow: isActive
                  ? `0 0 20px ${strategy.color}20`
                  : undefined,
              }}
              onClick={() => {
                if (!disabled) {
                  onSelect(strategy.id);
                }
              }}
            >
              {/* Active badge */}
              {isActive && (
                <div
                  className="absolute -top-2 -right-2 text-xs font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: strategy.color }}
                >
                  ACTIVE
                </div>
              )}

              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{strategy.icon}</span>
                    <div>
                      <h4 className="font-bold text-white text-sm">
                        {strategy.name}
                      </h4>
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${strategy.color}30`,
                          color: strategy.color,
                        }}
                      >
                        {strategy.shortName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                  {strategy.description}
                </p>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-gray-900/50 rounded-lg p-1.5">
                    <div className="text-[10px] text-gray-500">Stop Loss</div>
                    <div className="text-xs font-bold text-red-400">
                      {strategy.riskParams.stopLossPercent > 0
                        ? `${strategy.riskParams.stopLossPercent}%`
                        : 'None'}
                    </div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-1.5">
                    <div className="text-[10px] text-gray-500">Take Profit</div>
                    <div className="text-xs font-bold text-green-400">
                      {strategy.riskParams.takeProfitPercent > 0
                        ? `${strategy.riskParams.takeProfitPercent}%`
                        : 'Hold'}
                    </div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-1.5">
                    <div className="text-[10px] text-gray-500">Max Pos</div>
                    <div className="text-xs font-bold text-blue-400">
                      {strategy.riskParams.maxOpenPositions}
                    </div>
                  </div>
                </div>

                {/* Expand toggle */}
                <button
                  className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors w-full text-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedId(isExpanded ? null : strategy.id);
                  }}
                >
                  {isExpanded ? '▲ Less info' : '▼ More info'}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-700 space-y-3">
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {strategy.longDescription}
                    </p>

                    <div>
                      <div className="text-[10px] text-green-500 font-semibold mb-1">
                        ✅ PROS
                      </div>
                      {strategy.pros.map((pro, i) => (
                        <div
                          key={i}
                          className="text-[11px] text-gray-400 pl-3 mb-0.5"
                        >
                          • {pro}
                        </div>
                      ))}
                    </div>

                    <div>
                      <div className="text-[10px] text-red-500 font-semibold mb-1">
                        ⚠️ CONS
                      </div>
                      {strategy.cons.map((con, i) => (
                        <div
                          key={i}
                          className="text-[11px] text-gray-400 pl-3 mb-0.5"
                        >
                          • {con}
                        </div>
                      ))}
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-2">
                      <div className="text-[10px] text-gray-500 mb-1">
                        BEST FOR
                      </div>
                      <div className="text-[11px] text-gray-300">
                        {strategy.recommendedFor}
                      </div>
                    </div>

                    {/* Indicator weights visualization */}
                    <div>
                      <div className="text-[10px] text-gray-500 font-semibold mb-1">
                        INDICATOR WEIGHTS
                      </div>
                      <div className="space-y-1">
                        {Object.entries(strategy.indicatorWeights)
                          .filter(([, w]) => w > 0)
                          .sort(([, a], [, b]) => b - a)
                          .map(([name, weight]) => (
                            <div key={name} className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-400 w-20 capitalize">
                                {name.replace(/([A-Z])/g, ' $1')}
                              </span>
                              <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${weight * 3.3}%`,
                                    backgroundColor: strategy.color,
                                  }}
                                />
                              </div>
                              <span className="text-[10px] text-gray-500 w-6 text-right">
                                {weight}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
