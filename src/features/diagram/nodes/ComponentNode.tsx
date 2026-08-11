'use client';

import type { ReactNode } from 'react';

import type { AnyNodeConfig } from '@/domain/nodes/config';
import type { NodeKind } from '@/domain/simulation/node-kind';

import { ConfigFields } from './ConfigFields';
import { primaryFields } from './field-specs';
import { KIND_THEME } from './node-theme';
import { NodeLoadBar, NodeReadout, type MetricRowsBuilder } from './NodeReadout';
import { NodeShell } from './NodeShell';

export interface ComponentNodeProps {
  id: string;
  kind: NodeKind;
  config: AnyNodeConfig;
  selected?: boolean;
  rows: MetricRowsBuilder;
  hasInput?: boolean;
  hasOutput?: boolean;

  showLoad?: boolean;
  loadLabelKey?: 'node.load' | 'node.pressure';

  children?: ReactNode;
}

export function ComponentNode({
  id,
  kind,
  config,
  selected,
  rows,
  hasInput,
  hasOutput,
  showLoad = true,
  loadLabelKey,
  children,
}: ComponentNodeProps) {
  return (
    <div className="group/node">
      <NodeShell
        id={id}
        kind={kind}
        label={config.label}
        enabled={config.enabled}
        selected={selected}
        hasInput={hasInput}
        hasOutput={hasOutput}
      >
        <NodeReadout nodeId={id} rows={rows} />
        <ConfigFields
          nodeId={id}
          config={config}
          specs={primaryFields(kind)}
          accent={KIND_THEME[kind].accent}
        />
        {children}
        {showLoad ? <NodeLoadBar nodeId={id} labelKey={loadLabelKey} /> : <div className="pb-2" />}
      </NodeShell>
    </div>
  );
}
