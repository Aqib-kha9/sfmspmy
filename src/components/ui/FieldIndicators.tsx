
export function Req() {
    return <span className="field-req" title="Required field" aria-label="Required">*</span>;
}

export function Opt() {
    return <span className="field-opt" title="Optional field">(optional)</span>;
}

export function FormLegend() {
    return (
        <div className="form-legend full-field" aria-hidden="true">
            <span className="form-legend-item"><span className="field-req">*</span> Required field</span>
            <span className="form-legend-item"><span className="field-opt">(optional)</span> Optional field</span>
        </div>
    );
}
