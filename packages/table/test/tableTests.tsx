/**
 * Copyright 2016 Palantir Technologies, Inc. All rights reserved.
 * Licensed under the BSD-3 License as modified (the “License”); you may obtain a copy
 * of the license at https://github.com/palantir/blueprint/blob/master/LICENSE
 * and https://github.com/palantir/blueprint/blob/master/PATENTS
 */

import { expect } from "chai";
import * as React from "react";

import { Cell, Column, ITableProps, Table, TableLoadingOption } from "../src";
import * as Classes from "../src/common/classes";
import { Regions } from "../src/regions";
import { CellType, expectCellLoading } from "./cellTestUtils";
import { ElementHarness, ReactHarness } from "./harness";

describe("<Table>", () => {
    const harness = new ReactHarness();

    afterEach(() => {
        harness.unmount();
    });

    after(() => {
        harness.destroy();
    });

    it("Defaults to Base26Alpha column names", () => {
        const table = harness.mount(
            <Table>
                <Column />
                <Column />
                <Column name="My Name" />
            </Table>,
        );

        expect(table.find(`.${Classes.TABLE_COLUMN_NAME_TEXT}`, 2).text()).to.equal("My Name");
        expect(table.find(`.${Classes.TABLE_COLUMN_NAME_TEXT}`, 1).text()).to.equal("B");
    });

    it("Adds custom className to table container", () => {
        const CLASS_NAME = "my-custom-class-name";
        const table = harness.mount(
            <Table className={CLASS_NAME}>
                <Column />
                <Column />
                <Column />
            </Table>,
        );
        const hasCustomClass = table.find(`.${Classes.TABLE_CONTAINER}`, 0).hasClass(CLASS_NAME);
        expect(hasCustomClass).to.be.true;
    });

    it("Renders without ghost cells", () => {
        const table = harness.mount(
            <Table>
                <Column />
            </Table>,
        );

        expect(table.find(`.${Classes.TABLE_COLUMN_HEADERS} .${Classes.TABLE_HEADER}`, 0).element).to.be.ok;
        expect(table.find(`.${Classes.TABLE_COLUMN_HEADERS} .${Classes.TABLE_HEADER}`, 1).element).to.not.be.ok;
    });

    it("Renders ghost cells", () => {
        const table = harness.mount(
            <Table fillBodyWithGhostCells={true}>
                <Column />
            </Table>,
        );

        expect(table.find(`.${Classes.TABLE_COLUMN_HEADERS} .${Classes.TABLE_HEADER}`, 0).element).to.be.ok;
        expect(table.find(`.${Classes.TABLE_COLUMN_HEADERS} .${Classes.TABLE_HEADER}`, 1).element).to.be.ok;
    });

    it("Renders correctly with loading options", () => {
        const loadingOptions = [
            TableLoadingOption.CELLS,
            TableLoadingOption.COLUMN_HEADERS,
            TableLoadingOption.ROW_HEADERS,
        ];
        const tableHarness = harness.mount(
            <Table loadingOptions={loadingOptions} numRows={2}>
                <Column name="Column0" renderCell={renderCell} />
                <Column name="Column1" renderCell={renderCell} />
            </Table>,
        );

        expect(tableHarness.element.textContent).to.equal("");

        const cells = tableHarness.element.queryAll(`.${Classes.TABLE_CELL}`);
        cells.forEach((cell) => expectCellLoading(cell, CellType.BODY_CELL));

        const columnHeaders = tableHarness.element
            .queryAll(`.${Classes.TABLE_COLUMN_HEADERS} .${Classes.TABLE_HEADER}`);
        columnHeaders.forEach((columnHeader) => expectCellLoading(columnHeader, CellType.COLUMN_HEADER));

        const rowHeaders = tableHarness.element.queryAll(`.${Classes.TABLE_ROW_HEADERS} .${Classes.TABLE_HEADER}`);
        rowHeaders.forEach((rowHeader) => expectCellLoading(rowHeader, CellType.ROW_HEADER));
    });

    it("Gets and sets the tallest cell height in the table", () => {
        const renderCell = () => <Cell wrapText={true}>my cell value with lots and lots of words</Cell>;

        let table: Table;

        const saveTable = (t: Table) => table = t;

        harness.mount(
            <Table ref={saveTable} numRows={4}>
                <Column name="Column0" renderCell={renderCell} />
                <Column name="Column1" renderCell={renderCell} />
            </Table>,
        );

        table.resizeRowsByTallestCell(0);
        expect(table.state.rowHeights[0]).to.equal(40);
    });

    it("Selects all on click of upper-left corner", () => {
        const onSelection = sinon.spy();

        const table = harness.mount(
            <Table
                onSelection={onSelection}
                numRows={10}
            >
                <Column renderCell={renderCell}/>
                <Column renderCell={renderCell}/>
                <Column renderCell={renderCell}/>
            </Table>,
        );
        const menu = table.find(`.${Classes.TABLE_MENU}`);
        menu.mouse("click");
        expect(onSelection.args[0][0]).to.deep.equal([Regions.table()]);
    });

    describe("Resizing", () => {
        it("Resizes selected rows together", () => {
            const table = mountTable();
            const rows = getRowHeadersWrapper(table);
            const resizeHandleTarget = getRowResizeHandle(rows, 0);

            resizeHandleTarget.mouse("mousemove")
                .mouse("mousedown")
                .mouse("mousemove", 0, 2)
                .mouse("mouseup");

            expect(rows.find(`.${Classes.TABLE_HEADER}`, 0).bounds().height).to.equal(3);
            expect(rows.find(`.${Classes.TABLE_HEADER}`, 1).bounds().height).to.equal(3);
            expect(rows.find(`.${Classes.TABLE_HEADER}`, 2).bounds().height).to.equal(1);
            expect(rows.find(`.${Classes.TABLE_HEADER}`, 3).bounds().height).to.equal(1);
            expect(rows.find(`.${Classes.TABLE_HEADER}`, 4).bounds().height).to.equal(3);
            expect(rows.find(`.${Classes.TABLE_HEADER}`, 5).bounds().height).to.equal(3);
            expect(rows.find(`.${Classes.TABLE_HEADER}`, 6).bounds().height).to.equal(3);
            expect(rows.find(`.${Classes.TABLE_HEADER}`, 7).bounds().height).to.equal(1);
            expect(rows.find(`.${Classes.TABLE_HEADER}`, 8).bounds().height).to.equal(3);
        });

        it("Hides selected-region styles while resizing", () => {
            const table = mountTable();
            const resizeHandleTarget = getRowResizeHandle(getRowHeadersWrapper(table), 0);

            resizeHandleTarget.mouse("mousemove")
                .mouse("mousedown")
                .mouse("mousemove", 0, 2);
            expect(table.find(`.${Classes.TABLE_SELECTION_REGION}`).exists()).to.be.false;

            resizeHandleTarget.mouse("mouseup");
            expect(table.find(`.${Classes.TABLE_SELECTION_REGION}`).exists()).to.be.true;
        });

        function mountTable() {
            return harness.mount(
                // set the row height so small so they can all fit in the viewport and be rendered
                <Table
                    defaultRowHeight={1}
                    isRowResizable={true}
                    minRowHeight={1}
                    numRows={10}
                    selectedRegions={[Regions.row(0, 1), Regions.row(4, 6), Regions.row(8)]}
                >
                    <Column renderCell={renderCell}/>
                    <Column renderCell={renderCell}/>
                    <Column renderCell={renderCell}/>
                </Table>,
            );
        }

        function getRowHeadersWrapper(table: ElementHarness) {
            return table.find(`.${Classes.TABLE_ROW_HEADERS}`);
        }

        function getRowResizeHandle(rows: ElementHarness, rowIndex: number) {
            return rows.find(`.${Classes.TABLE_RESIZE_HANDLE_TARGET}`, rowIndex);
        }
    });

    describe("Reordering", () => {
        // Phantom renders the table at a fixed width regardless of the number of columns. if
        // NEW_INDEX is too big, we risk simulating mouse events that fall outside of the table
        // bounds, which causes tests to fail.
        const OLD_INDEX = 0;
        const NEW_INDEX = 1;
        const LENGTH = 2;
        const NUM_COLUMNS = 5;
        const NUM_ROWS = 5;

        // table hardcodes itself to 60px tall in Phantom, so use a tiny sizes to ensure
        // all rows fit.
        const HEIGHT_IN_PX = 5;
        const WIDTH_IN_PX = 5;

        const OFFSET_X = (NEW_INDEX + LENGTH) * WIDTH_IN_PX;
        const OFFSET_Y = (NEW_INDEX + LENGTH) * HEIGHT_IN_PX;

        let onColumnsReordered: Sinon.SinonSpy;
        let onRowsReordered: Sinon.SinonSpy;
        let onSelection: Sinon.SinonSpy;

        beforeEach(() => {
            onColumnsReordered = sinon.spy();
            onRowsReordered = sinon.spy();
            onSelection = sinon.spy();
        });

        it("Shows preview guide and invokes callback when columns reordered", () => {
            const table = mountTable({
                isColumnReorderable: true,
                onColumnsReordered,
                selectedRegions: [Regions.column(OLD_INDEX, LENGTH - 1)],
            });
            const header = getTableHeader(getColumnHeadersWrapper(table), 0);
            header.mouse("mousedown").mouse("mousemove", OFFSET_X);

            const guide = table.find(`.${Classes.TABLE_VERTICAL_GUIDE}`);
            expect(guide).to.exist;

            header.mouse("mouseup", OFFSET_X);
            expect(onColumnsReordered.called).to.be.true;
            expect(onColumnsReordered.calledWith(OLD_INDEX, NEW_INDEX, LENGTH)).to.be.true;
        });

        it("Shows preview guide and invokes callback when rows reordered", () => {
            const table = mountTable({
                isRowReorderable: true,
                onRowsReordered,
                selectedRegions: [Regions.row(OLD_INDEX, LENGTH - 1)],
            });
            const header = getTableHeader(getRowHeadersWrapper(table), 0);
            header.mouse("mousedown").mouse("mousemove", 0, OFFSET_Y);

            const guide = table.find(`.${Classes.TABLE_HORIZONTAL_GUIDE}`);
            expect(guide).to.exist;

            header.mouse("mouseup", 0, OFFSET_Y);
            expect(onRowsReordered.called).to.be.true;
            expect(onRowsReordered.calledWith(OLD_INDEX, NEW_INDEX, LENGTH)).to.be.true;
        });

        it("Doesn't work on columns if there is no selected region defined yet", () => {
            const table = mountTable({
                isColumnReorderable: true,
                onColumnsReordered,
            });
            getTableHeader(getColumnHeadersWrapper(table), 0)
                .mouse("mousedown")
                .mouse("mousemove", OFFSET_X)
                .mouse("mouseup", OFFSET_X);
            expect(onColumnsReordered.called).to.be.false;
        });

        it("Doesn't work on rows if there is no selected region defined yet", () => {
            const table = mountTable({
                isColumnReorderable: true,
                onColumnsReordered,
            });
            getTableHeader(getColumnHeadersWrapper(table), 0)
                .mouse("mousedown")
                .mouse("mousemove", OFFSET_X)
                .mouse("mouseup", OFFSET_X);
            expect(onColumnsReordered.called).to.be.false;
        });

        it("Selecting a column via click and then reordering it works", () => {
            const table = mountTable({
                isColumnReorderable: true,
                onColumnsReordered,
                onSelection,
            });
            const header = getTableHeader(getColumnHeadersWrapper(table), 0);

             // "click" doesn't trigger DragHandler.onActivate
            header.mouse("mousedown").mouse("mouseup");
            expect(onSelection.called).to.be.true;

            // now we can reorder the column one spot to the right
            const newIndex = 1;
            const length = 1;
            const offsetX = (newIndex + length) * WIDTH_IN_PX;
            header.mouse("mousedown")
                .mouse("mousemove", offsetX)
                .mouse("mouseup", offsetX);
            expect(onColumnsReordered.called).to.be.true;
            expect(onColumnsReordered.calledWith(OLD_INDEX, newIndex, length)).to.be.true;
        });

        it("Selecting multiple columns via click+drag and then reordering works", () => {
            const table = mountTable({
                isColumnReorderable: true,
                onColumnsReordered,
                onSelection,
            });
            const header = getTableHeader(getColumnHeadersWrapper(table), 0);
            const selectionOffsetX = (OLD_INDEX + LENGTH) * WIDTH_IN_PX;
            header
                .mouse("mousedown")
                .mouse("mousemove", selectionOffsetX)
                .mouse("mouseup", selectionOffsetX);
            expect(onSelection.called).to.be.true;

            header.mouse("mousedown")
                .mouse("mousemove", OFFSET_X)
                .mouse("mouseup", OFFSET_X);
            expect(onColumnsReordered.called).to.be.true;
            expect(onColumnsReordered.calledWith(OLD_INDEX, NEW_INDEX, LENGTH)).to.be.true;
        });

        it("Moves selection with reordered column when reordering is complete (if selection not controlled)", () => {
            const table = mountTable({
                isColumnReorderable: true,
                onColumnsReordered,
            });
            const headers = getColumnHeadersWrapper(table);
            const oldHeader = getTableHeader(headers, 0);
            const newHeader = getTableHeader(headers, 1);

            const newIndex = 1;
            const length = 1;
            const offsetX = (newIndex + length) * WIDTH_IN_PX;

            // select the old header
            oldHeader.mouse("mousedown").mouse("mouseup");

            // show selection region while reordering
            oldHeader.mouse("mousedown").mouse("mousemove", offsetX);
            expect(table.find(`.${Classes.TABLE_SELECTION_REGION}`).exists()).to.be.true;

            oldHeader.mouse("mouseup", offsetX);
            expect(table.find(`.${Classes.TABLE_SELECTION_REGION}`).exists()).to.be.true;
            expect(oldHeader.hasClass(Classes.TABLE_HEADER_SELECTED)).to.be.false;
            expect(newHeader.hasClass(Classes.TABLE_HEADER_SELECTED)).to.be.true;
        });

        function mountTable(props: Partial<ITableProps>) {
            const table = harness.mount(
                <Table
                    columnWidths={Array(NUM_COLUMNS).fill(WIDTH_IN_PX)}
                    numRows={NUM_ROWS}
                    rowHeights={Array(NUM_ROWS).fill(HEIGHT_IN_PX)}
                    {...props}
                >
                    <Column renderCell={renderCell}/>
                    <Column renderCell={renderCell}/>
                    <Column renderCell={renderCell}/>
                    <Column renderCell={renderCell}/>
                    <Column renderCell={renderCell}/>
                </Table>,
            );
            return table;
        }

        function getColumnHeadersWrapper(table: ElementHarness) {
            return table.find(`.${Classes.TABLE_COLUMN_HEADERS}`);
        }

        function getRowHeadersWrapper(table: ElementHarness) {
            return table.find(`.${Classes.TABLE_ROW_HEADERS}`);
        }

        function getTableHeader(headersWrapper: ElementHarness, columnIndex: number) {
            return headersWrapper.find(`.${Classes.TABLE_HEADER}`, columnIndex);
        }
    });

    xit("Accepts a sparse array of column widths", () => {
        const table = harness.mount(
            <Table columnWidths={[null, 200, null]} defaultColumnWidth={75}>
                <Column />
                <Column />
                <Column />
            </Table>,
        );

        const columns = table.find(`.${Classes.TABLE_COLUMN_HEADERS}`);
        expect(columns.find(`.${Classes.TABLE_HEADER}`, 0).bounds().width).to.equal(75);
        expect(columns.find(`.${Classes.TABLE_HEADER}`, 1).bounds().width).to.equal(200);
        expect(columns.find(`.${Classes.TABLE_HEADER}`, 2).bounds().width).to.equal(75);
    });

    xdescribe("Persists column widths", () => {
        const expectHeaderWidth = (table: ElementHarness, index: number, width: number) => {
            expect(table
                .find(`.${Classes.TABLE_COLUMN_HEADERS}`)
                .find(`.${Classes.TABLE_HEADER}`, index)
                .bounds().width,
            ).to.equal(width);
        };

        it("remembers width for columns that have an ID", () => {
            const columns = [
                <Column key="a" id="a" />,
                <Column key="b" id="b" />,
                <Column key="c" id="c" />,
            ];

            // default and explicit sizes sizes
            const table0 = harness.mount(
                <Table columnWidths={[null, 100, null]} defaultColumnWidth={50}>{columns}</Table>,
            );
            expectHeaderWidth(table0, 0, 50);
            expectHeaderWidth(table0, 1, 100);
            expectHeaderWidth(table0, 2, 50);

            // removing explicit size props
            const table1 = harness.mount(
                <Table>{columns}</Table>,
            );
            expectHeaderWidth(table1, 0, 50);
            expectHeaderWidth(table1, 1, 100);
            expectHeaderWidth(table1, 2, 50);

            // re-arranging and REMOVING columns
            const table2 = harness.mount(
                <Table>{[columns[1], columns[0]]}</Table>,
            );
            expectHeaderWidth(table2, 0, 100);
            expectHeaderWidth(table2, 1, 50);

            // re-arranging and ADDING columns
            const table3 = harness.mount(
                <Table defaultColumnWidth={51}>{columns}</Table>,
            );
            expectHeaderWidth(table3, 0, 50);
            expectHeaderWidth(table3, 1, 100);
            expectHeaderWidth(table3, 2, 51);
        });

        it("remembers width for columns without IDs using index", () => {
            const columns = [
                <Column key="a" id="a" />,
                <Column key="b" />,
                <Column key="c" />,
            ];

            // default and explicit sizes sizes
            const table0 = harness.mount(
                <Table columnWidths={[null, 100, null]} defaultColumnWidth={50}>{columns}</Table>,
            );
            expectHeaderWidth(table0, 0, 50);
            expectHeaderWidth(table0, 1, 100);
            expectHeaderWidth(table0, 2, 50);

            // removing explicit size props
            const table1 = harness.mount(
                <Table>{columns}</Table>,
            );
            expectHeaderWidth(table1, 0, 50);
            expectHeaderWidth(table1, 1, 100);
            expectHeaderWidth(table1, 2, 50);

            // re-arranging and REMOVING columns
            const table2 = harness.mount(
                <Table>{[columns[1], columns[0]]}</Table>,
            );
            expectHeaderWidth(table2, 0, 50); // <= difference when no IDs
            expectHeaderWidth(table2, 1, 50);

            // re-arranging and ADDING columns
            const table3 = harness.mount(
                <Table defaultColumnWidth={51}>{columns}</Table>,
            );
            expectHeaderWidth(table3, 0, 50);
            expectHeaderWidth(table3, 1, 50); // <= difference when no IDs
            expectHeaderWidth(table3, 2, 51);
        });
    });

    function renderCell() {
        return <Cell>gg</Cell>;
    }
});
